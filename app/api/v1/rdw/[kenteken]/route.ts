import { NextRequest, NextResponse } from 'next/server';
import type { WeightClass, CO2Class, EuroClass } from '@/types/toll-network';

const RDW_VOERTUIGEN = 'https://opendata.rdw.nl/resource/m9d7-ebf2.json';
const RDW_BRANDSTOF = 'https://opendata.rdw.nl/resource/8ys7-d773.json';

interface RdwVehicleResult {
  kenteken: string;
  merk: string;
  handelsbenaming: string;
  voertuigsoort: string;
  europeseVoertuigcategorie: string;
  inrichting: string;
  // Weights (kg)
  technischeMaxMassa: number;
  toegestaneMaxMassa: number;
  maximumMassaSamenstelling: number;
  massaRijklaar: number;
  // Derived for vrachtwagenheffing
  heffingsgewicht: number;
  heffingsgewichtToelichting: string;
  weightClass: WeightClass;
  // Emission
  brandstof: string;
  uitlaatemissieniveau: string;
  euroClass: EuroClass;
  co2Class: CO2Class;
  // Eligibility
  isHeffingsplichtig: boolean;
  heffingsplichtReden: string;
}

/**
 * Normalize kenteken: uppercase, remove dashes/spaces.
 */
function normalizeKenteken(raw: string): string {
  return raw.replace(/[-\s]/g, '').toUpperCase();
}

/**
 * Parse Euro emission class from RDW uitlaatemissieniveau string.
 * Heavy vehicles: "EURO VI C", "EURO V", "EURO IV"
 * Light vehicles: "EURO 6", "EURO 5 A", "EURO 4"
 */
function parseEuroClass(uitlaat: string): EuroClass {
  if (!uitlaat) return 6; // default to VI if unknown
  const upper = uitlaat.toUpperCase();

  // Roman numerals (heavy vehicles)
  if (upper.includes('VI')) return 6;
  if (upper.includes(' V') && !upper.includes('VI')) return 5;
  if (upper.includes('IV') && !upper.includes('VI')) return 4;
  if (upper.includes('III')) return 3;
  if (upper.includes(' II') && !upper.includes('III')) return 2;
  if (upper.includes(' I') && !upper.includes('II') && !upper.includes('IV') && !upper.includes('VI')) return 1;

  // Arabic numerals (light vehicles)
  const numMatch = upper.match(/EURO\s*(\d)/);
  if (numMatch) {
    const n = parseInt(numMatch[1]);
    if (n >= 0 && n <= 6) return n as EuroClass;
  }

  return 6;
}

/**
 * Determine CO2 class. Class 5 = zero-emission, class 1 = conventional.
 * Classes 2-4 require VECTO data which isn't in RDW open data.
 */
function determineCO2Class(brandstof: string, co2Klasse?: string): CO2Class {
  if (co2Klasse && co2Klasse !== '1') {
    const n = parseInt(co2Klasse);
    if (n >= 1 && n <= 5) return n as CO2Class;
  }

  const fuel = brandstof.toLowerCase();
  if (fuel.includes('elektr') || fuel.includes('waterstof') || fuel.includes('hydrogen')) {
    return 5;
  }

  return 1; // conventional
}

/**
 * Determine the weight to use for vrachtwagenheffing.
 * For tractor units (trekkers), use maximum_massa_samenstelling.
 * For rigid trucks, use technische_max_massa_voertuig.
 */
function determineHeffingsgewicht(
  technischeMax: number,
  toegestaneMax: number,
  massaSamenstelling: number,
  inrichting: string,
  voertuigsoort: string
): { gewicht: number; toelichting: string } {
  const isTrekker =
    inrichting.toLowerCase().includes('trekker') ||
    inrichting.toLowerCase().includes('oplegger');

  // For tractor units: the combination mass determines the weight class
  // (the tractor itself is ~18t but pulls 44t combinations)
  if (isTrekker && massaSamenstelling > technischeMax) {
    return {
      gewicht: massaSamenstelling,
      toelichting: `Trekkercombinatie: max. massa samenstelling ${massaSamenstelling.toLocaleString('nl-NL')} kg (voertuig zelf: ${technischeMax.toLocaleString('nl-NL')} kg)`,
    };
  }

  // For rigid trucks: use the vehicle's own max mass
  const gewicht = technischeMax || toegestaneMax;
  return {
    gewicht,
    toelichting: `Technische max. massa voertuig: ${gewicht.toLocaleString('nl-NL')} kg`,
  };
}

function toWeightClass(kg: number): WeightClass {
  if (kg <= 12000) return '3500-12000';
  if (kg <= 18000) return '12000-18000';
  if (kg <= 32000) return '18000-32000';
  return '32000+';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ kenteken: string }> }
) {
  try {
    const { kenteken: rawKenteken } = await params;
    const kenteken = normalizeKenteken(rawKenteken);

    if (kenteken.length < 4 || kenteken.length > 8) {
      return NextResponse.json(
        { error: 'Ongeldig kenteken' },
        { status: 400 }
      );
    }

    // Fetch vehicle + fuel data in parallel
    const [voertuigRes, brandstofRes] = await Promise.all([
      fetch(`${RDW_VOERTUIGEN}?kenteken=${kenteken}`),
      fetch(`${RDW_BRANDSTOF}?kenteken=${kenteken}&brandstof_volgnummer=1`),
    ]);

    if (!voertuigRes.ok) {
      return NextResponse.json(
        { error: 'RDW API niet bereikbaar' },
        { status: 502 }
      );
    }

    const voertuigen = await voertuigRes.json();
    const brandstoffen = await brandstofRes.json();

    if (!voertuigen.length) {
      return NextResponse.json(
        { error: `Kenteken ${rawKenteken} niet gevonden in RDW-register` },
        { status: 404 }
      );
    }

    const v = voertuigen[0];
    const b = brandstoffen[0] || {};

    const technischeMax = parseInt(v.technische_max_massa_voertuig || '0');
    const toegestaneMax = parseInt(v.toegestane_maximum_massa_voertuig || '0');
    const massaSamenstelling = parseInt(v.maximum_massa_samenstelling || '0');
    const massaRijklaar = parseInt(v.massa_rijklaar || '0');
    const inrichting = v.inrichting || '';
    const voertuigsoort = v.voertuigsoort || '';
    const euCat = v.europese_voertuigcategorie || '';

    // Determine if subject to vrachtwagenheffing
    const maxMass = Math.max(technischeMax, toegestaneMax);
    const isN2N3 = ['N2', 'N3'].includes(euCat);
    const isBedrijfsauto = voertuigsoort === 'Bedrijfsauto';
    const isHeavyEnough = maxMass > 3500;

    let isHeffingsplichtig = isHeavyEnough && (isN2N3 || isBedrijfsauto);
    let heffingsplichtReden = '';

    if (!isHeavyEnough) {
      heffingsplichtReden = `Massa ${maxMass.toLocaleString('nl-NL')} kg ≤ 3.500 kg`;
    } else if (!isN2N3 && !isBedrijfsauto) {
      heffingsplichtReden = `Voertuigcategorie ${euCat} (${voertuigsoort}) valt buiten N2/N3`;
      isHeffingsplichtig = false;
    } else {
      heffingsplichtReden = `Categorie ${euCat}, ${maxMass.toLocaleString('nl-NL')} kg > 3.500 kg`;
    }

    // Determine weight for tariff
    const { gewicht, toelichting } = determineHeffingsgewicht(
      technischeMax, toegestaneMax, massaSamenstelling, inrichting, voertuigsoort
    );

    const brandstof = b.brandstof_omschrijving || 'Onbekend';
    const uitlaat = b.uitlaatemissieniveau || b.emissiecode_omschrijving || '';
    const euroClass = parseEuroClass(uitlaat);
    const co2Class = determineCO2Class(brandstof, b.co2_emissieklasse);

    const result: RdwVehicleResult = {
      kenteken,
      merk: v.merk || '',
      handelsbenaming: v.handelsbenaming || '',
      voertuigsoort,
      europeseVoertuigcategorie: euCat,
      inrichting,
      technischeMaxMassa: technischeMax,
      toegestaneMaxMassa: toegestaneMax,
      maximumMassaSamenstelling: massaSamenstelling,
      massaRijklaar: massaRijklaar,
      heffingsgewicht: gewicht,
      heffingsgewichtToelichting: toelichting,
      weightClass: toWeightClass(gewicht),
      brandstof,
      uitlaatemissieniveau: uitlaat,
      euroClass,
      co2Class,
      isHeffingsplichtig,
      heffingsplichtReden,
    };

    return NextResponse.json(result, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400', // cache 24h - RDW data rarely changes
      },
    });
  } catch (e) {
    console.error('RDW lookup error:', e);
    return NextResponse.json(
      { error: 'RDW opzoeking mislukt' },
      { status: 500 }
    );
  }
}
