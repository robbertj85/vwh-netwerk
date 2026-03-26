import { NextRequest, NextResponse } from 'next/server';

function baseUrl(request: NextRequest) {
  const proto = request.headers.get('x-forwarded-proto') || 'http';
  const host = request.headers.get('host') || 'localhost:3003';
  return `${proto}://${host}`;
}

export async function GET(request: NextRequest) {
  const base = baseUrl(request);

  return NextResponse.json(
    {
      title: 'Vrachtwagenheffing Tolnetwerk - OGC API',
      description:
        'OGC API Features service voor het vrachtwagenheffing tolnetwerk in Nederland.',
      links: [
        {
          href: `${base}/api/ogc`,
          rel: 'self',
          type: 'application/json',
          title: 'This document',
        },
        {
          href: `${base}/api/ogc/conformance`,
          rel: 'conformance',
          type: 'application/json',
          title: 'Conformance declaration',
        },
        {
          href: `${base}/api/ogc/collections`,
          rel: 'data',
          type: 'application/json',
          title: 'Feature collections',
        },
        {
          href: `${base}/api/v1/openapi`,
          rel: 'service-desc',
          type: 'application/vnd.oai.openapi+json;version=3.0',
          title: 'OpenAPI definition',
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
