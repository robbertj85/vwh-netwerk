import type { CO2Class, EuroClass, WeightClass, TariffParams } from '@/types/toll-network';

// ============================================================
// Official VWH Tariffs - Prijspeil 2026
// Source: vrachtwagenheffing.nl/dit-gaat-u-betalen
// Effective: 1 July 2026
// ============================================================

// CO2 Class 1 tariffs (€/km) indexed by [weightClass][euroClass]
const CO2_CLASS_1_TARIFFS: Record<WeightClass, Record<EuroClass, number>> = {
  '3500-12000': { 0: 0.272, 1: 0.221, 2: 0.211, 3: 0.184, 4: 0.162, 5: 0.131, 6: 0.113 },
  '12000-18000': { 0: 0.392, 1: 0.315, 2: 0.300, 3: 0.266, 4: 0.229, 5: 0.186, 6: 0.160 },
  '18000-32000': { 0: 0.432, 1: 0.364, 2: 0.347, 3: 0.308, 4: 0.264, 5: 0.212, 6: 0.182 },
  '32000+':      { 0: 0.487, 1: 0.409, 2: 0.392, 3: 0.349, 4: 0.298, 5: 0.236, 6: 0.201 },
};

// CO2 Class 2-5 tariffs (€/km) indexed by [weightClass][co2Class]
const CO2_CLASS_2_5_TARIFFS: Record<WeightClass, Record<2 | 3 | 4 | 5, number>> = {
  '3500-12000': { 2: 0.103, 3: 0.092, 4: 0.063, 5: 0.025 },
  '12000-18000': { 2: 0.145, 3: 0.129, 4: 0.088, 5: 0.035 },
  '18000-32000': { 2: 0.165, 3: 0.148, 4: 0.100, 5: 0.037 },
  '32000+':      { 2: 0.183, 3: 0.165, 4: 0.111, 5: 0.038 },
};

/**
 * Get the tariff rate in €/km for the given vehicle configuration.
 */
export function getTariffRate(params: TariffParams): number {
  const { co2Class, euroClass, weightClass } = params;

  if (co2Class === 1) {
    return CO2_CLASS_1_TARIFFS[weightClass][euroClass];
  }

  return CO2_CLASS_2_5_TARIFFS[weightClass][co2Class as 2 | 3 | 4 | 5];
}

/**
 * Calculate total toll cost for a given distance and vehicle configuration.
 */
export function calculateTollCost(distanceKm: number, params: TariffParams): {
  ratePerKm: number;
  totalCost: number;
} {
  const ratePerKm = getTariffRate(params);
  return {
    ratePerKm,
    totalCost: Math.round(distanceKm * ratePerKm * 100) / 100,
  };
}

/**
 * Get all tariff rates for display in a table.
 */
export function getAllTariffs(): {
  co2Class1: typeof CO2_CLASS_1_TARIFFS;
  co2Class2_5: typeof CO2_CLASS_2_5_TARIFFS;
} {
  return {
    co2Class1: CO2_CLASS_1_TARIFFS,
    co2Class2_5: CO2_CLASS_2_5_TARIFFS,
  };
}

/**
 * Average tariff across the fleet (for quick estimates).
 */
export const AVERAGE_TARIFF_PER_KM = 0.191;
