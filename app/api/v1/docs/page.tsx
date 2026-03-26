'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const SPEC = {
  openapi: '3.0.3',
  info: {
    title: 'Vrachtwagenheffing Netwerk API',
    version: '1.0.0',
    description:
      'REST API en OGC API Features service voor het vrachtwagenheffing tolnetwerk in Nederland.',
    license: { name: 'MIT', url: 'https://opensource.org/licenses/MIT' },
  },
  servers: [{ url: '/', description: 'Huidige server' }],
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
      get: { summary: 'Netwerkstatistieken', tags: ['Netwerk'], responses: { '200': { description: 'Statistieken' } } },
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
        description: 'Bereken rijroute (ORS driving-hgv), match tegen tolnetwerk, en bereken kosten.',
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
          '200': { description: 'Routeberekening resultaat', content: { 'application/json': { schema: { $ref: '#/components/schemas/RouteResult' } } } },
          '400': { description: 'Ongeldige invoer' },
          '404': { description: 'Geen route gevonden' },
        },
      },
    },
    '/api/v1/openapi': {
      get: { summary: 'OpenAPI specificatie (JSON)', tags: ['Netwerk'], responses: { '200': { description: 'OpenAPI 3.0 spec' } } },
    },
    '/api/ogc': {
      get: { summary: 'Landing page', tags: ['OGC API Features'], responses: { '200': { description: 'Landing page met links' } } },
    },
    '/api/ogc/conformance': {
      get: { summary: 'Conformance declaration', tags: ['OGC API Features'], responses: { '200': { description: 'Conformance classes' } } },
    },
    '/api/ogc/collections': {
      get: { summary: 'Feature collections', tags: ['OGC API Features'], responses: { '200': { description: 'Beschikbare collections' } } },
    },
    '/api/ogc/collections/toll-network': {
      get: { summary: 'Toll network collection', tags: ['OGC API Features'], responses: { '200': { description: 'Collection metadata' } } },
    },
    '/api/ogc/collections/toll-network/items': {
      get: {
        summary: 'Feature items',
        tags: ['OGC API Features'],
        description: 'GeoJSON FeatureCollection met paginering, bbox-filter en property-filters.',
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10, maximum: 10000 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
          { name: 'bbox', in: 'query', schema: { type: 'string' }, description: 'minLng,minLat,maxLng,maxLat' },
          { name: 'roadType', in: 'query', schema: { type: 'string', enum: ['highway', 'national', 'local'] } },
          { name: 'roadName', in: 'query', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'GeoJSON FeatureCollection', content: { 'application/geo+json': {} } } },
      },
    },
    '/api/ogc/collections/toll-network/items/{featureId}': {
      get: {
        summary: 'Single feature',
        tags: ['OGC API Features'],
        parameters: [{ name: 'featureId', in: 'path', required: true, schema: { type: 'string' } }],
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
          lat: { type: 'number', description: 'Breedtegraad (WGS84)' },
          lng: { type: 'number', description: 'Lengtegraad (WGS84)' },
          address: { type: 'string', description: 'Adresomschrijving' },
        },
      },
      TariffParams: {
        type: 'object',
        properties: {
          co2Class: { type: 'integer', enum: [1, 2, 3, 4, 5], description: 'CO2-emissieklasse' },
          euroClass: { type: 'integer', enum: [0, 1, 2, 3, 4, 5, 6], description: 'Euro-emissieklasse (bij CO2 klasse 1)' },
          weightClass: { type: 'string', enum: ['3500-12000', '12000-18000', '18000-32000', '32000+'] },
        },
      },
      RouteResult: {
        type: 'object',
        properties: {
          totalRouteDistanceKm: { type: 'number' },
          tollDistanceKm: { type: 'number' },
          tollPercentage: { type: 'number' },
          routeGeometry: { type: 'array', items: { type: 'array', items: { type: 'number' } } },
          matchedSections: { type: 'array', items: { type: 'object' } },
          tariff: {
            type: 'object',
            properties: {
              ratePerKm: { type: 'number' },
              totalCost: { type: 'number' },
              params: { $ref: '#/components/schemas/TariffParams' },
            },
          },
        },
      },
    },
  },
};

export default function ApiDocsPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/swagger-ui-dist@5/swagger-ui.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js';
    script.onload = () => {
      if (
        containerRef.current &&
        (window as unknown as Record<string, unknown>).SwaggerUIBundle
      ) {
        const SwaggerUIBundle = (
          window as unknown as Record<string, unknown>
        ).SwaggerUIBundle as (config: Record<string, unknown>) => void;
        SwaggerUIBundle({
          spec: SPEC,
          domNode: containerRef.current,
          deepLinking: true,
          defaultModelsExpandDepth: 1,
          defaultModelExpandDepth: 2,
          docExpansion: 'list',
          filter: true,
          tryItOutEnabled: true,
        });
      }
    };
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(link);
      document.head.removeChild(script);
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <Link
          href="/"
          className="text-brand-700 hover:text-brand-800 text-sm flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" />
          Terug naar kaart
        </Link>
        <h1 className="text-lg font-bold text-gray-900">API Documentatie</h1>
        <span className="text-xs text-gray-400">OpenAPI 3.0</span>
        <a
          href="/api/v1/openapi"
          target="_blank"
          className="ml-auto text-xs text-brand-600 hover:underline"
        >
          openapi.json
        </a>
      </div>
      <div ref={containerRef} />
    </div>
  );
}
