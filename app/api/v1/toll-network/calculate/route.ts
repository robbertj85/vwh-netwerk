import { NextRequest, NextResponse } from 'next/server';
import { loadTollData } from '@/lib/load-toll-data';
import { matchRouteToNetwork, filterByTravelDirection } from '@/lib/toll-network-utils';
import { calculateTollCost } from '@/lib/tariffs';
import type {
  TariffParams,
  GeocodedLocation,
  RouteCalculation,
  TollNetworkFeature,
} from '@/types/toll-network';

const ORS_API_URL = process.env.ORS_API_URL || 'https://ors.transportbeat.nl';
const ORS_API_KEY = process.env.ORS_API_KEY || '';

interface CalcRequest {
  origin: GeocodedLocation;
  destination: GeocodedLocation;
  tariffParams: TariffParams;
}

interface OrsStep {
  distance: number; // meters
  name: string;
  type: number;
  way_points: [number, number];
}

/**
 * Check if an ORS step road name matches any road in the toll network.
 * ORS names can be "Stadhoudersweg, A13" or "Kruithuisweg, N470".
 */
function isTollRoad(stepName: string, tollRoadNames: Set<string>): boolean {
  if (!stepName || stepName === '-') return false;

  // Direct match
  if (tollRoadNames.has(stepName)) return true;

  // Extract A/N road numbers from the name (e.g., "A13" from "Stadhoudersweg, A13")
  const matches = stepName.match(/\b([AN]\s*\d+)\b/gi);
  if (matches) {
    for (const m of matches) {
      const normalized = m.replace(/\s/g, '').toUpperCase();
      if (tollRoadNames.has(normalized)) return true;
    }
  }

  // Check each comma-separated part
  for (const part of stepName.split(',')) {
    const trimmed = part.trim();
    if (tollRoadNames.has(trimmed)) return true;
  }

  return false;
}

export async function POST(request: NextRequest) {
  try {
    const body: CalcRequest = await request.json();
    const { origin, destination, tariffParams } = body;

    if (!origin?.lat || !origin?.lng || !destination?.lat || !destination?.lng) {
      return NextResponse.json(
        { error: 'Vertrekpunt en bestemming zijn verplicht' },
        { status: 400 }
      );
    }

    if (!tariffParams?.weightClass || !tariffParams?.co2Class) {
      return NextResponse.json(
        { error: 'Voertuigconfiguratie is verplicht' },
        { status: 400 }
      );
    }

    // 1. Get driving route from ORS (driving-hgv profile)
    const orsUrl = `${ORS_API_URL}/ors/v2/directions/driving-hgv/geojson`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'VWH-TollCalculator/1.0',
    };
    if (ORS_API_KEY) {
      headers['X-API-Key'] = ORS_API_KEY;
    }

    const orsRes = await fetch(orsUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        coordinates: [
          [origin.lng, origin.lat],
          [destination.lng, destination.lat],
        ],
      }),
    });

    if (!orsRes.ok) {
      const errText = await orsRes.text().catch(() => '');
      console.error('ORS error:', orsRes.status, errText);
      return NextResponse.json(
        { error: `Route berekening mislukt (ORS: ${orsRes.status})` },
        { status: 502 }
      );
    }

    const orsData = await orsRes.json();

    if (!orsData.features?.length) {
      return NextResponse.json(
        { error: 'Geen route gevonden tussen de opgegeven locaties' },
        { status: 404 }
      );
    }

    const routeFeature = orsData.features[0];
    const routeGeometry: [number, number][] = routeFeature.geometry.coordinates;

    // Total distance from ORS summary (meters → km)
    const orsSummary = routeFeature.properties?.summary;
    const totalRouteDistanceKm = orsSummary?.distance
      ? Math.round(orsSummary.distance / 100) / 10
      : 0;

    // 2. Calculate toll distance from ORS steps (road name matching)
    const tollData = loadTollData();
    const tollRoadNames = new Set(tollData.features.map((f) => f.properties.roadName));

    // Method 1: ORS steps — match road names against NDW toll network
    let orsTollDistanceM = 0;
    const segments = routeFeature.properties?.segments || [];
    const tollStepWaypoints: [number, number][] = [];
    const matchedRoads = new Set<string>();

    for (const segment of segments) {
      for (const step of (segment.steps || []) as OrsStep[]) {
        if (isTollRoad(step.name, tollRoadNames)) {
          orsTollDistanceM += step.distance;
          tollStepWaypoints.push(step.way_points);
          // Extract matched road name
          const rm = step.name.match(/\b([AN]\s*\d+)\b/i);
          if (rm) matchedRoads.add(rm[1].replace(/\s/g, '').toUpperCase());
        }
      }
    }
    const orsTollKm = Math.round(orsTollDistanceM / 100) / 10;

    // Method 2: NDW grid — coordinate-based spatial matching
    const allMatched = matchRouteToNetwork(routeGeometry, tollData.features);
    const dirFiltered = filterByTravelDirection(routeGeometry, allMatched);
    // Direction filter already removes opposing sections — don't halve again
    const ndwTollKm = Math.min(
      Math.round(dirFiltered.reduce((s, f) => s + f.properties.distance, 0) / 100) / 10,
      totalRouteDistanceKm
    );

    // Use ORS steps as primary (more accurate), fall back to NDW grid
    const tollDistanceKm = orsTollKm > 0 ? orsTollKm : ndwTollKm;
    const tollPercentage =
      totalRouteDistanceKm > 0
        ? Math.round((tollDistanceKm / totalRouteDistanceKm) * 1000) / 10
        : 0;

    // 3. Build toll geometry segments from waypoints (for green map overlay)
    const matchedSections: TollNetworkFeature[] = [];
    for (const [startIdx, endIdx] of tollStepWaypoints) {
      if (startIdx < routeGeometry.length && endIdx < routeGeometry.length) {
        matchedSections.push({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: routeGeometry.slice(startIdx, endIdx + 1),
          },
          properties: {
            id: `step-${startIdx}`,
            roadName: '',
            distance: 0,
            roadType: 'highway',
          },
        });
      }
    }

    // 4. Calculate tariff
    const { ratePerKm, totalCost } = calculateTollCost(tollDistanceKm, tariffParams);

    const result: RouteCalculation = {
      origin,
      destination,
      totalRouteDistanceKm,
      tollDistanceKm,
      tollPercentage,
      routeGeometry,
      matchedSections,
      tariff: { ratePerKm, totalCost, params: tariffParams },
      methods: {
        orsSteps: { distanceKm: orsTollKm, matchedRoads: [...matchedRoads] },
        ndwGrid: { distanceKm: ndwTollKm, sectionsMatched: dirFiltered.length },
      },
    };

    return NextResponse.json(result, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  } catch (e) {
    console.error('Toll calculation error:', e);
    return NextResponse.json(
      { error: 'Berekening mislukt' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
