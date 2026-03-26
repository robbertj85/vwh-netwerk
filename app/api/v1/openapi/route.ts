import { NextRequest, NextResponse } from 'next/server';

function baseUrl(request: NextRequest) {
  const proto = request.headers.get('x-forwarded-proto') || 'http';
  const host = request.headers.get('host') || 'localhost:3003';
  return `${proto}://${host}`;
}

export async function GET(request: NextRequest) {
  const base = baseUrl(request);

  const spec = {
    openapi: '3.0.3',
    info: {
      title: 'Vrachtwagenheffing Netwerk API',
      version: '1.0.0',
      description:
        'REST API en OGC API Features service voor het vrachtwagenheffing tolnetwerk in Nederland. Biedt toegang tot netwerksecties, statistieken, data-export, routeberekeningen en OGC-conforme feature access.',
      license: { name: 'MIT', url: 'https://opensource.org/licenses/MIT' },
    },
    servers: [{ url: base, description: 'Huidige server' }],
    tags: [
      { name: 'Netwerk', description: 'Tolnetwerk data en statistieken' },
      { name: 'Export', description: 'Data downloads (GeoJSON, GeoPackage)' },
      { name: 'Route', description: 'Routeberekening en tariefcalculatie' },
      { name: 'OGC API Features', description: 'OGC API Features (Part 1: Core)' },
    ],
    paths: {
      '/api/v1/toll-network': {
        get: {
          summary: 'Lijst netwerksecties',
          tags: ['Netwerk'],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 100, maximum: 1000 } },
            { name: 'roadType', in: 'query', schema: { type: 'string', enum: ['highway', 'national', 'local'] } },
            { name: 'roadName', in: 'query', schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Gepagineerde lijst met secties' } },
        },
      },
      '/api/v1/toll-network/stats': {
        get: {
          summary: 'Netwerkstatistieken',
          tags: ['Netwerk'],
          responses: { '200': { description: 'Statistieken' } },
        },
      },
      '/api/v1/toll-network/export': {
        get: {
          summary: 'Data exporteren',
          tags: ['Export'],
          parameters: [
            { name: 'format', in: 'query', required: true, schema: { type: 'string', enum: ['geojson', 'gpkg'] } },
          ],
          responses: { '200': { description: 'Bestandsdownload' } },
        },
      },
      '/api/v1/toll-network/calculate': {
        post: {
          summary: 'Route berekenen',
          tags: ['Route'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CalculateRequest' },
                example: {
                  origin: { lat: 52.3676, lng: 4.9041, address: 'Amsterdam' },
                  destination: { lat: 51.4416, lng: 5.4697, address: 'Eindhoven' },
                  tariffParams: { co2Class: 1, euroClass: 6, weightClass: '32000+' },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Routeberekening resultaat' },
            '400': { description: 'Ongeldige invoer' },
            '404': { description: 'Geen route gevonden' },
          },
        },
      },
      '/api/ogc': {
        get: { summary: 'OGC Landing page', tags: ['OGC API Features'], responses: { '200': { description: 'Landing page' } } },
      },
      '/api/ogc/conformance': {
        get: { summary: 'OGC Conformance declaration', tags: ['OGC API Features'], responses: { '200': { description: 'Conformance classes' } } },
      },
      '/api/ogc/collections': {
        get: { summary: 'OGC Feature collections', tags: ['OGC API Features'], responses: { '200': { description: 'Collections' } } },
      },
      '/api/ogc/collections/toll-network': {
        get: { summary: 'OGC Toll network collection', tags: ['OGC API Features'], responses: { '200': { description: 'Collection metadata' } } },
      },
      '/api/ogc/collections/toll-network/items': {
        get: {
          summary: 'OGC Feature items',
          tags: ['OGC API Features'],
          parameters: [
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 10, maximum: 10000 } },
            { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
            { name: 'bbox', in: 'query', schema: { type: 'string' }, description: 'minLng,minLat,maxLng,maxLat' },
            { name: 'roadType', in: 'query', schema: { type: 'string', enum: ['highway', 'national', 'local'] } },
            { name: 'roadName', in: 'query', schema: { type: 'string' } },
          ],
          responses: {
            '200': {
              description: 'GeoJSON FeatureCollection',
              content: { 'application/geo+json': {} },
            },
          },
        },
      },
      '/api/ogc/collections/toll-network/items/{featureId}': {
        get: {
          summary: 'OGC Single feature',
          tags: ['OGC API Features'],
          parameters: [
            { name: 'featureId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '200': { description: 'GeoJSON Feature', content: { 'application/geo+json': {} } },
            '404': { description: 'Feature niet gevonden' },
          },
        },
      },
    },
    components: {
      schemas: {
        CalculateRequest: {
          type: 'object',
          required: ['origin', 'destination', 'tariffParams'],
          properties: {
            origin: { $ref: '#/components/schemas/Location' },
            destination: { $ref: '#/components/schemas/Location' },
            tariffParams: { $ref: '#/components/schemas/TariffParams' },
          },
        },
        Location: {
          type: 'object',
          properties: {
            lat: { type: 'number' },
            lng: { type: 'number' },
            address: { type: 'string' },
          },
        },
        TariffParams: {
          type: 'object',
          properties: {
            co2Class: { type: 'integer', enum: [1, 2, 3, 4, 5] },
            euroClass: { type: 'integer', enum: [0, 1, 2, 3, 4, 5, 6] },
            weightClass: { type: 'string', enum: ['3500-12000', '12000-18000', '18000-32000', '32000+'] },
          },
        },
      },
    },
  };

  return NextResponse.json(spec, {
    headers: {
      'Content-Type': 'application/vnd.oai.openapi+json;version=3.0',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
