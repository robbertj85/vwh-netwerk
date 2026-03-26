import { NextRequest, NextResponse } from 'next/server';
import { loadTollData } from '@/lib/load-toll-data';

function baseUrl(request: NextRequest) {
  const proto = request.headers.get('x-forwarded-proto') || 'http';
  const host = request.headers.get('host') || 'localhost:3003';
  return `${proto}://${host}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ featureId: string }> }
) {
  try {
    const { featureId } = await params;
    const data = loadTollData();
    const base = baseUrl(request);

    const feature = data.features.find((f) => f.properties.id === featureId);

    if (!feature) {
      return NextResponse.json(
        { code: 'NotFound', description: `Feature '${featureId}' niet gevonden` },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        ...feature,
        id: feature.properties.id,
        links: [
          {
            href: `${base}/api/ogc/collections/toll-network/items/${featureId}`,
            rel: 'self',
            type: 'application/geo+json',
          },
          {
            href: `${base}/api/ogc/collections/toll-network`,
            rel: 'collection',
            type: 'application/json',
          },
        ],
      },
      {
        headers: {
          'Content-Type': 'application/geo+json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=3600',
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
