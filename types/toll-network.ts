// ============================================================
// Vrachtwagenheffing (HGV Toll) Network Types
// ============================================================

// --- GeoJSON Types ---

export interface TollNetworkFeature {
  type: 'Feature';
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
  properties: {
    id: string;
    roadName: string;
    distance: number; // metres
    roadType: RoadType;
  };
}

export interface TollNetworkGeoJSON {
  type: 'FeatureCollection';
  features: TollNetworkFeature[];
  metadata: {
    totalSections: number;
    totalDistanceKm: number;
    dataDate: string;
    uniqueRoads: number;
    source: string;
  };
}

// --- Road Classification ---

export type RoadType = 'highway' | 'national' | 'local';

export const ROAD_TYPE_LABELS: Record<RoadType, string> = {
  highway: 'Autosnelweg (A-weg)',
  national: 'Rijksweg (N-weg)',
  local: 'Lokale weg',
};

export const ROAD_TYPE_COLORS: Record<RoadType, string> = {
  highway: '#2563eb',   // blue-600
  national: '#f97316',  // orange-500
  local: '#6b7280',     // gray-500
};

// --- Vehicle Configuration ---

export type WeightClass = '3500-12000' | '12000-18000' | '18000-32000' | '32000+';
export type CO2Class = 1 | 2 | 3 | 4 | 5;
export type EuroClass = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const WEIGHT_CLASS_LABELS: Record<WeightClass, string> = {
  '3500-12000': '> 3.500 - 12.000 kg',
  '12000-18000': '12.000 - 18.000 kg',
  '18000-32000': '18.000 - 32.000 kg',
  '32000+': '> 32.000 kg',
};

export const CO2_CLASS_LABELS: Record<CO2Class, string> = {
  1: 'Klasse 1 - Conventioneel',
  2: 'Klasse 2 - ≥5% schoner',
  3: 'Klasse 3 - ≥8% schoner',
  4: 'Klasse 4 - ≥50% schoner',
  5: 'Klasse 5 - Zero-emissie',
};

export const EURO_CLASS_LABELS: Record<EuroClass, string> = {
  0: 'Euro 0',
  1: 'Euro I',
  2: 'Euro II',
  3: 'Euro III',
  4: 'Euro IV',
  5: 'Euro V',
  6: 'Euro VI',
};

// --- Tariff Parameters ---

export interface TariffParams {
  co2Class: CO2Class;
  euroClass: EuroClass;
  weightClass: WeightClass;
}

// --- Route Calculation ---

export interface RouteCalculation {
  origin: GeocodedLocation;
  destination: GeocodedLocation;
  totalRouteDistanceKm: number;
  tollDistanceKm: number;
  tollPercentage: number;
  routeGeometry: [number, number][];
  matchedSections: TollNetworkFeature[];
  tariff: {
    ratePerKm: number;
    totalCost: number;
    params: TariffParams;
  };
  methods?: {
    orsSteps: { distanceKm: number; matchedRoads: string[] };
    ndwGrid: { distanceKm: number; sectionsMatched: number };
  };
}

export interface GeocodedLocation {
  lat: number;
  lng: number;
  address: string;
}

// --- Network Statistics ---

export interface NetworkStats {
  totalSections: number;
  totalDistanceKm: number;
  networkLengthKm: number; // One-way / unique road length (≈ totalDistanceKm / 2)
  uniqueRoads: number;
  dataDate: string;
  roadTypes: Record<RoadType, { count: number; distanceKm: number }>;
  topRoads: { name: string; sections: number; distanceKm: number; roadType: RoadType }[];
}

// --- PDOK Geocoding ---

export interface PDOKSuggestion {
  id: string;
  type: string;
  weergavenaam: string;
  score: number;
}

export interface PDOKLookupResult {
  id: string;
  weergavenaam: string;
  centroide_ll: string; // "POINT(lng lat)"
}
