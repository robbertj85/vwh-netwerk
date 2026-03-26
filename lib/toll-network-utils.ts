import type {
  TollNetworkGeoJSON,
  TollNetworkFeature,
  NetworkStats,
  RoadType,
} from '@/types/toll-network';

// --- Road Type Classification ---

export function classifyRoadType(name: string): RoadType {
  if (/^A\d+/.test(name)) return 'highway';
  if (/^N\d+/.test(name)) return 'national';
  return 'local';
}

// --- Haversine Distance ---

const R_KM = 6371;
const DEG_TO_RAD = Math.PI / 180;

export function haversineDistanceKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const dLat = (lat2 - lat1) * DEG_TO_RAD;
  const dLng = (lng2 - lng1) * DEG_TO_RAD;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * DEG_TO_RAD) *
    Math.cos(lat2 * DEG_TO_RAD) *
    Math.sin(dLng / 2) ** 2;
  return R_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// --- Network Statistics ---

export function calculateNetworkStats(data: TollNetworkGeoJSON): NetworkStats {
  const roadMap = new Map<string, { sections: number; distanceM: number; roadType: RoadType }>();
  const roadTypes: Record<RoadType, { count: number; distanceKm: number }> = {
    highway: { count: 0, distanceKm: 0 },
    national: { count: 0, distanceKm: 0 },
    local: { count: 0, distanceKm: 0 },
  };

  for (const feature of data.features) {
    const { roadName, distance, roadType } = feature.properties;

    roadTypes[roadType].count++;
    roadTypes[roadType].distanceKm += distance / 1000;

    if (!roadMap.has(roadName)) {
      roadMap.set(roadName, { sections: 0, distanceM: 0, roadType });
    }
    const entry = roadMap.get(roadName)!;
    entry.sections++;
    entry.distanceM += distance;
  }

  // Round distance values
  for (const rt of Object.values(roadTypes)) {
    rt.distanceKm = Math.round(rt.distanceKm * 10) / 10;
  }

  const topRoads = [...roadMap.entries()]
    .map(([name, d]) => ({
      name,
      sections: d.sections,
      distanceKm: Math.round(d.distanceM / 100) / 10,
      roadType: d.roadType,
    }))
    .sort((a, b) => b.distanceKm - a.distanceKm)
    .slice(0, 20);

  const totalDistanceKm =
    Math.round(
      data.features.reduce((sum, f) => sum + f.properties.distance, 0) / 100
    ) / 10;

  return {
    totalSections: data.features.length,
    totalDistanceKm,
    // Sections are directional (one per direction). Divide by 2 for approximate unique road length.
    networkLengthKm: Math.round(totalDistanceKm / 2 * 10) / 10,
    uniqueRoads: roadMap.size,
    dataDate: data.metadata.dataDate,
    roadTypes,
    topRoads,
  };
}

// --- Grid-based Spatial Index for Route Matching ---

const GRID_CELL_SIZE = 0.005; // ~350m at Dutch latitudes

function gridKey(lng: number, lat: number): string {
  return `${Math.floor(lng / GRID_CELL_SIZE)}_${Math.floor(lat / GRID_CELL_SIZE)}`;
}

/**
 * Match a driving route against the toll network.
 * Returns the toll sections that overlap with the route.
 */
export function matchRouteToNetwork(
  routeCoords: [number, number][],
  features: TollNetworkFeature[],
  thresholdKm: number = 0.035
): TollNetworkFeature[] {
  // Build grid index from route coordinates
  const routeGrid = new Map<string, [number, number][]>();
  for (const coord of routeCoords) {
    const key = gridKey(coord[0], coord[1]);
    if (!routeGrid.has(key)) routeGrid.set(key, []);
    routeGrid.get(key)!.push(coord);
  }

  const matched: TollNetworkFeature[] = [];

  for (const feature of features) {
    let isMatch = false;

    for (const [lng, lat] of feature.geometry.coordinates) {
      if (isMatch) break;
      const cx = Math.floor(lng / GRID_CELL_SIZE);
      const cy = Math.floor(lat / GRID_CELL_SIZE);

      for (let dx = -1; dx <= 1 && !isMatch; dx++) {
        for (let dy = -1; dy <= 1 && !isMatch; dy++) {
          const candidates = routeGrid.get(`${cx + dx}_${cy + dy}`);
          if (!candidates) continue;
          for (const [rlng, rlat] of candidates) {
            if (haversineDistanceKm(lat, lng, rlat, rlng) < thresholdKm) {
              isMatch = true;
              break;
            }
          }
        }
      }
    }

    if (isMatch) matched.push(feature);
  }

  return matched;
}

/**
 * Compute bearing (degrees 0-360) between two points.
 */
function bearingDeg(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const dLng = (lng2 - lng1) * DEG_TO_RAD;
  const y = Math.sin(dLng) * Math.cos(lat2 * DEG_TO_RAD);
  const x =
    Math.cos(lat1 * DEG_TO_RAD) * Math.sin(lat2 * DEG_TO_RAD) -
    Math.sin(lat1 * DEG_TO_RAD) * Math.cos(lat2 * DEG_TO_RAD) * Math.cos(dLng);
  return (Math.atan2(y, x) * (180 / Math.PI) + 360) % 360;
}

/**
 * Filter matched sections to only those traveling in the same direction as the route.
 * This removes opposing-direction sections (NDW data is directional).
 */
export function filterByTravelDirection(
  routeCoords: [number, number][],
  matched: TollNetworkFeature[]
): TollNetworkFeature[] {
  if (routeCoords.length < 2) return matched;

  return matched.filter((section) => {
    const coords = section.geometry.coordinates;
    if (coords.length < 2) return true;

    // Section bearing (start → end)
    const sectionBearing = bearingDeg(
      coords[0][1], coords[0][0],
      coords[coords.length - 1][1], coords[coords.length - 1][0]
    );

    // Find nearest route point to section midpoint
    const midIdx = Math.floor(coords.length / 2);
    const [midLng, midLat] = coords[midIdx];
    let minDist = Infinity;
    let nearestIdx = 0;
    for (let i = 0; i < routeCoords.length; i++) {
      const d =
        (routeCoords[i][0] - midLng) ** 2 +
        (routeCoords[i][1] - midLat) ** 2;
      if (d < minDist) {
        minDist = d;
        nearestIdx = i;
      }
    }

    // Route bearing at that point
    const ri = Math.min(nearestIdx, routeCoords.length - 2);
    const routeBearing = bearingDeg(
      routeCoords[ri][1], routeCoords[ri][0],
      routeCoords[ri + 1][1], routeCoords[ri + 1][0]
    );

    // Keep if bearings differ by less than 90°
    let diff = Math.abs(sectionBearing - routeBearing);
    if (diff > 180) diff = 360 - diff;
    return diff < 90;
  });
}

/**
 * Calculate total distance from matched sections (km).
 */
export function sumSectionDistances(sections: TollNetworkFeature[]): number {
  return (
    Math.round(
      sections.reduce((sum, s) => sum + s.properties.distance, 0) / 100
    ) / 10
  );
}

/**
 * Measure the actual route distance that overlaps with the toll network.
 * Walks along the route point-by-point, checking if each segment is near a toll section.
 * This avoids double-counting and gives the true on-network distance.
 */
export function measureRouteOnNetwork(
  routeCoords: [number, number][],
  features: TollNetworkFeature[],
  thresholdKm: number = 0.035
): number {
  if (routeCoords.length < 2) return 0;

  // Build grid index from toll network coordinates
  const networkGrid = new Map<string, boolean>();
  for (const feature of features) {
    for (const [lng, lat] of feature.geometry.coordinates) {
      const key = gridKey(lng, lat);
      networkGrid.set(key, true);
    }
  }

  let onNetworkKm = 0;

  for (let i = 1; i < routeCoords.length; i++) {
    const [lng, lat] = routeCoords[i];
    const cx = Math.floor(lng / GRID_CELL_SIZE);
    const cy = Math.floor(lat / GRID_CELL_SIZE);

    // Check if this route point is near any toll network coordinate
    let isOnNetwork = false;
    outer:
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (networkGrid.has(`${cx + dx}_${cy + dy}`)) {
          isOnNetwork = true;
          break outer;
        }
      }
    }

    if (isOnNetwork) {
      onNetworkKm += haversineDistanceKm(
        routeCoords[i - 1][1], routeCoords[i - 1][0],
        lat, lng
      );
    }
  }

  return Math.round(onNetworkKm * 10) / 10;
}

/**
 * Calculate the total distance of a route from its coordinates (km).
 */
export function calculateRouteDistanceKm(coords: [number, number][]): number {
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    total += haversineDistanceKm(
      coords[i - 1][1], coords[i - 1][0],
      coords[i][1], coords[i][0]
    );
  }
  return Math.round(total * 10) / 10;
}
