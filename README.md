# Vrachtwagenheffing Netwerk

Interactieve kaart van het Nederlandse vrachtwagenheffing tolnetwerk.

## Features

- Tolnetwerk visualisatie (18.000+ secties van NDW)
- Routeberekening met ORS driving-hgv profiel
- Tariefcalculatie (prijspeil 2026) per CO2/Euro/gewichtsklasse
- RDW kentekenopzoeking voor automatische voertuigconfiguratie
- GeoJSON + GeoPackage downloads
- REST API + OGC API Features (Part 1: Core)
- OpenAPI 3.0 / Swagger documentatie

## Setup

```bash
npm install
cp .env.example .env.local
# Vul ORS_API_KEY in .env.local
```

## Data verwerken

De GeoJSON en GeoPackage bestanden staan in `public/data/`. Om te updaten:

```bash
npm run process-toll-data          # standaard: 20260301
npm run process-toll-data 20260401 # specifieke datum
```

Bron: [NDW Vrachtwagenheffing Register](https://maps.ndw.nu/api/v1/hgvChargeTollCollectionNetwork/)

## Development

```bash
npm run dev
```

Production build:

```bash
npm run build
npm start
```

## Environment variables

| Variabele | Beschrijving | Verplicht |
|-----------|-------------|-----------|
| `ORS_API_URL` | OpenRouteService URL | Nee (default: ors.transportbeat.nl) |
| `ORS_API_KEY` | ORS API key (X-API-Key header) | Ja, voor routeberekening |

## API

| Endpoint | Beschrijving |
|----------|-------------|
| `GET /api/v1/toll-network` | Secties (paginated) |
| `GET /api/v1/toll-network/stats` | Statistieken |
| `GET /api/v1/toll-network/export?format=geojson\|gpkg` | Download |
| `POST /api/v1/toll-network/calculate` | Routeberekening |
| `GET /api/v1/rdw/{kenteken}` | RDW voertuigopzoeking |
| `GET /api/v1/openapi` | OpenAPI 3.0 spec |
| `GET /api/v1/docs` | Swagger UI |
| `GET /api/ogc/...` | OGC API Features |

## Licentie

MIT
