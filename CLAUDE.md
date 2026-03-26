# CLAUDE.md

## Project

Vrachtwagenheffing Netwerk — interactive map of the Dutch HGV toll network.
Next.js 16, React 19, TypeScript, Tailwind CSS, Leaflet, Lucide icons.

## Commands

- `npm run dev` — dev server (Turbopack, slow first compile on large routes)
- `npm run build && npm start` — production server (recommended for testing)
- `npm run process-toll-data` — download NDW XML, generate GeoJSON + GeoPackage
- `npm run process-toll-data 20260401` — specific data date

## Architecture

- `app/page.tsx` — main page (client component, dynamic map import)
- `components/SidePanel.tsx` — sidebar with Netwerk/Route/Tarieven tabs
- `components/TollNetworkMap.tsx` — Leaflet map (Canvas renderer, SSR disabled)
- `lib/tariffs.ts` — official 2026 tariff tables
- `lib/toll-network-utils.ts` — stats, spatial matching, distance calc
- `lib/load-toll-data.ts` — server-side GeoJSON loader with in-memory cache

## API routes

- `/api/v1/toll-network` — paginated sections (GET)
- `/api/v1/toll-network/stats` — network statistics (GET)
- `/api/v1/toll-network/export` — GeoJSON/GeoPackage download (GET)
- `/api/v1/toll-network/calculate` — route calculation via ORS + road name matching (POST)
- `/api/v1/rdw/[kenteken]` — RDW vehicle lookup (GET)
- `/api/v1/openapi` — OpenAPI 3.0 spec (GET)
- `/api/ogc/...` — OGC API Features (Part 1: Core)

## Key decisions

- **Toll distance**: calculated from ORS route steps matching road names against NDW toll road list (not spatial grid matching — that overcounts due to dual carriageways)
- **Vehicle weight**: for tractor units (trekkers), uses `maximum_massa_samenstelling` (combination mass), not just tractor mass
- **Data files**: full `toll-network.geojson` (9MB) + `.gpkg` (7.5MB) committed to git — needed for Vercel deployment
- **ORS routing**: self-hosted at ors.transportbeat.nl, auth via `X-API-Key` header
- **Production**: use `npm run build && npm start` — Turbopack dev server hangs on large API routes

## Environment variables

- `ORS_API_URL` — ORS base URL (default: https://ors.transportbeat.nl)
- `ORS_API_KEY` — ORS API key sent as X-API-Key header

## Style

- Brand color: red/burgundy (`brand-700` = #b91c1c)
- Dutch language throughout (nl-NL)
- Not affiliated with RDW or government — disclaimer in footer + About modal
- MIT license
