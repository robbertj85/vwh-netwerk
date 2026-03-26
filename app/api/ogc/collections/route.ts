import { NextRequest, NextResponse } from 'next/server';
import { loadTollData } from '@/lib/load-toll-data';

function baseUrl(request: NextRequest) {
  const proto = request.headers.get('x-forwarded-proto') || 'http';
  const host = request.headers.get('host') || 'localhost:3003';
  return `${proto}://${host}`;
}

export async function GET(request: NextRequest) {
  const base = baseUrl(request);

  let extent;
  try {
    const data = loadTollData();
    extent = {
      spatial: {
        bbox: [[3.37, 50.75, 7.21, 53.47]],
        crs: 'http://www.opengis.net/def/crs/OGC/1.3/CRS84',
      },
    };
    void data;
  } catch {
    extent = undefined;
  }

  return NextResponse.json(
    {
      links: [
        {
          href: `${base}/api/ogc/collections`,
          rel: 'self',
          type: 'application/json',
          title: 'This document',
        },
      ],
      collections: [
        {
          id: 'toll-network',
          title: 'Vrachtwagenheffing Tolnetwerk',
          description:
            'Wegvakken van het Nederlandse vrachtwagenheffing tolnetwerk. Elke sectie is richtingsgebonden (enkelbaans).',
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
          ],
          extent,
          itemType: 'feature',
          crs: ['http://www.opengis.net/def/crs/OGC/1.3/CRS84'],
          storageCrs: 'http://www.opengis.net/def/crs/OGC/1.3/CRS84',
        },
      ],
    },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
      },
    }
  );
}
