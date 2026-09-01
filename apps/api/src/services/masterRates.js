/**
 * Master Rates & Pricing Constants
 * Centralized definition of baseline labor rates, billing rules, and pricing defaults.
 */

export const DEFAULT_RATES = {
  HOURLY_LABOR_RATE: 65.00,
  EMERGENCY_HOURLY_RATE: 95.00,
  WEEKEND_HOURLY_RATE: 85.00,
  DEFAULT_MATERIAL_MARKUP_PERCENT: 0,
  DEFAULT_TAX_RATE_PERCENT: 0,
  MINIMUM_SERVICE_FEE: 50.00
};

/**
 * Resolves effective hourly rate for a job or tenant.
 * @param {Object} params
 * @param {string} [params.rateType] - 'flat' | 'hourly'
 * @param {number} [params.hourlyRate] - Custom hourly rate if specified
 * @param {number} [params.tenantDefaultRate] - Tenant default hourly rate if configured
 * @returns {number} Effective hourly rate
 */
export function resolveEffectiveHourlyRate({ rateType, hourlyRate, tenantDefaultRate } = {}) {
  if (rateType === 'hourly' && typeof hourlyRate === 'number' && hourlyRate > 0) {
    return hourlyRate;
  }
  if (typeof tenantDefaultRate === 'number' && tenantDefaultRate > 0) {
    return tenantDefaultRate;
  }
  return DEFAULT_RATES.HOURLY_LABOR_RATE;
}
