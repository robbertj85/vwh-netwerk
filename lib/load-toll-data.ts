import { readFileSync } from 'fs';
import { join } from 'path';
import type { TollNetworkGeoJSON } from '@/types/toll-network';

let cached: TollNetworkGeoJSON | null = null;

/**
 * Load the toll network GeoJSON from public/data/.
 * Caches the parsed JSON in memory for subsequent calls.
 * Server-side only — do not import from client components.
 */
export function loadTollData(): TollNetworkGeoJSON {
  if (!cached) {
    const raw = readFileSync(
      join(process.cwd(), 'public/data/toll-network.geojson'),
      'utf-8'
    );
    cached = JSON.parse(raw);
  }
  return cached!;
}
