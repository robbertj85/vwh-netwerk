import { NextRequest, NextResponse } from 'next/server';
import { loadTollData } from '@/lib/load-toll-data';

function baseUrl(request: NextRequest) {
  const proto = request.headers.get('x-forwarded-proto') || 'http';
  const host = request.headers.get('host') || 'localhost:3003';
  return `${proto}://${host}`;
}

export async function GET(request: NextRequest) {
  const base = baseUrl(request);
  let numberMatched = 0;
  let dataDate = '';

  try {
    const data = loadTollData();
    numberMatched = data.features.length;
    dataDate = data.metadata.dataDate;
  } catch {
    // data not available
  }

  return NextResponse.json(
    {
      id: 'toll-network',
      title: 'Vrachtwagenheffing Tolnetwerk',
      description:
        'Wegvakken van het Nederlandse vrachtwagenheffing tolnetwerk (NDW-register). Elke sectie is richtingsgebonden met een uniek sectie-ID, wegnaam, lengte en wegtype.',
      links: [
        {
          href: `${base}/api/ogc/collections/toll-network`,
          rel: 'self',
          type: 'application/json',
        },
        {
          href: `${base}/api/ogc/collections/toll-network/items`,
          rel: 'items',
          type: 'application/geo+json',
          title: 'Toll network sections',
        },
        {
          href: `${base}/api/v1/toll-network/export?format=gpkg`,
          rel: 'enclosure',
          type: 'application/geopackage+sqlite3',
          title: 'Download as GeoPackage',
        },
      ],
      extent: {
        spatial: {
          bbox: [[3.37, 50.75, 7.21, 53.47]],
          crs: 'http://www.opengis.net/def/crs/OGC/1.3/CRS84',
        },
      },
      itemType: 'feature',
      crs: ['http://www.opengis.net/def/crs/OGC/1.3/CRS84'],
      storageCrs: 'http://www.opengis.net/def/crs/OGC/1.3/CRS84',
      numberMatched,
      ...(dataDate && {
        updated: dataDate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'),
      }),
    },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
      },
    }
  );
}
