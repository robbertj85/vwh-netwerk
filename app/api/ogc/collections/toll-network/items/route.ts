import { NextRequest, NextResponse } from 'next/server';
import { loadTollData } from '@/lib/load-toll-data';

function baseUrl(request: NextRequest) {
  const proto = request.headers.get('x-forwarded-proto') || 'http';
  const host = request.headers.get('host') || 'localhost:3003';
  return `${proto}://${host}`;
}

function bboxIntersects(
  coords: [number, number][],
  bbox: [number, number, number, number]
): boolean {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  return coords.some(
    ([lng, lat]) => lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat
  );
}

export async function GET(request: NextRequest) {
  try {
    const data = loadTollData();
    const base = baseUrl(request);
    const url = request.nextUrl;

    // Parse parameters
    const limit = Math.min(
      10000,
      Math.max(1, parseInt(url.searchParams.get('limit') || '10'))
    );
    const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0'));
    const bboxParam = url.searchParams.get('bbox');
    const roadType = url.searchParams.get('roadType');
    const roadName = url.searchParams.get('roadName');

    let features = data.features;

    // Spatial filter (bbox=minLng,minLat,maxLng,maxLat)
    if (bboxParam) {
      const parts = bboxParam.split(',').map(Number);
      if (parts.length === 4 && parts.every((n) => !isNaN(n))) {
        const bbox = parts as [number, number, number, number];
        features = features.filter((f) =>
          bboxIntersects(f.geometry.coordinates, bbox)
        );
      }
    }

    // Property filters
    if (roadType) {
      features = features.filter((f) => f.properties.roadType === roadType);
    }
    if (roadName) {
      const q = roadName.toLowerCase();
      features = features.filter((f) =>
        f.properties.roadName.toLowerCase().includes(q)
      );
    }

    const numberMatched = features.length;
    const paged = features.slice(offset, offset + limit);
    const numberReturned = paged.length;

    // Build Link headers
    const itemsBase = `${base}/api/ogc/collections/toll-network/items`;
    const links: { href: string; rel: string; type: string; title?: string }[] = [
      { href: `${itemsBase}?limit=${limit}&offset=${offset}`, rel: 'self', type: 'application/geo+json' },
    ];

    if (offset + limit < numberMatched) {
      links.push({
        href: `${itemsBase}?limit=${limit}&offset=${offset + limit}`,
        rel: 'next',
        type: 'application/geo+json',
      });
    }
    if (offset > 0) {
      links.push({
        href: `${itemsBase}?limit=${limit}&offset=${Math.max(0, offset - limit)}`,
        rel: 'prev',
        type: 'application/geo+json',
      });
    }

    // Add feature id to each item
    const items = paged.map((f) => ({
      ...f,
      id: f.properties.id,
    }));

    const linkHeader = links
      .map((l) => `<${l.href}>; rel="${l.rel}"; type="${l.type}"`)
      .join(', ');

    return NextResponse.json(
      {
        type: 'FeatureCollection',
        features: items,
        links,
        numberMatched,
        numberReturned,
        timeStamp: new Date().toISOString(),
      },
      {
        headers: {
          'Content-Type': 'application/geo+json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=300',
          Link: linkHeader,
        },
      }
    );
  } catch {
    return NextResponse.json(
      { error: 'Data niet beschikbaar' },
      { status: 503 }
    );
  }
}
