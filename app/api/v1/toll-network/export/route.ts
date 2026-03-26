import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET(request: NextRequest) {
  const format = request.nextUrl.searchParams.get('format') || 'geojson';

  try {
    if (format === 'geojson') {
      const data = readFileSync(
        join(process.cwd(), 'public/data/toll-network.geojson')
      );
      return new NextResponse(data, {
        headers: {
          'Content-Type': 'application/geo+json',
          'Content-Disposition':
            'attachment; filename="vwh-tolnetwerk.geojson"',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    if (format === 'gpkg') {
      const data = readFileSync(
        join(process.cwd(), 'public/data/toll-network.gpkg')
      );
      return new NextResponse(data, {
        headers: {
          'Content-Type': 'application/geopackage+sqlite3',
          'Content-Disposition':
            'attachment; filename="vwh-tolnetwerk.gpkg"',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    return NextResponse.json(
      { error: 'Ongeldig formaat. Gebruik: geojson, gpkg' },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { error: 'Bestand niet gevonden. Voer process-toll-network.mjs uit.' },
      { status: 503 }
    );
  }
}
