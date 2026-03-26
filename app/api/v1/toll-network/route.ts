import { NextRequest, NextResponse } from 'next/server';
import { loadTollData } from '@/lib/load-toll-data';
import type { RoadType } from '@/types/toll-network';

export async function GET(request: NextRequest) {
  try {
    const data = loadTollData();
    const url = request.nextUrl;

    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(1000, Math.max(1, parseInt(url.searchParams.get('limit') || '100')));
    const roadType = url.searchParams.get('roadType') as RoadType | null;
    const roadName = url.searchParams.get('roadName');

    let features = data.features;

    if (roadType && ['highway', 'national', 'local'].includes(roadType)) {
      features = features.filter((f) => f.properties.roadType === roadType);
    }
    if (roadName) {
      const query = roadName.toLowerCase();
      features = features.filter((f) =>
        f.properties.roadName.toLowerCase().includes(query)
      );
    }

    const total = features.length;
    const offset = (page - 1) * limit;
    const paged = features.slice(offset, offset + limit);

    return NextResponse.json(
      {
        data: paged,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=3600',
        },
      }
    );
  } catch {
    return NextResponse.json(
      { error: 'Data niet beschikbaar. Voer process-toll-network.mjs uit.' },
      { status: 503 }
    );
  }
}
