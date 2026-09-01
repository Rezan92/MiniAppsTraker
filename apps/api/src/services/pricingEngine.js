/**
 * Pricing Engine Service
 * Centralized calculations for line items, invoices, and job financial summaries.
 * Ensures strict currency rounding (2 decimal places) and avoids floating point precision drift.
 */

export const roundCurrency = (amount) => {
  const num = Number(amount) || 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

/**
 * Calculate totals for a collection of invoice line items.
 * @param {Array} lineItems
 * @returns {{ lineLabor: number, lineMaterials: number, billableTotal: number }}
 */
export function calculateLineItemTotals(lineItems = []) {
  let lineLabor = 0;
  let lineMaterials = 0;

  for (const item of lineItems) {
    if (item.is_billable !== false) {
      const amount = Number(item.amount) || 0;
      if (item.source_type === 'labor' || item.source_type === 'ad_hoc') {
        lineLabor += amount;
      } else if (item.source_type === 'material') {
        lineMaterials += amount;
      }
    }
  }

  return {
    lineLabor: roundCurrency(lineLabor),
    lineMaterials: roundCurrency(lineMaterials),
    billableTotal: roundCurrency(lineLabor + lineMaterials)
  };
}

/**
 * Calculate complete invoice financials from base amounts and line items.
 * @param {Object} params
 * @param {number} [params.baseLaborAmount=0] - Initial fixed labor amount
 * @param {Array} [params.lineItems=[]] - Line items
 * @param {number} [params.markupAmount=0] - Optional material markup
 * @param {number} [params.taxRatePercent=0] - Optional sales/service tax percentage
 * @returns {{ laborAmount: number, materialsAmount: number, subtotal: number, taxAmount: number, totalAmount: number }}
 */
export function calculateInvoiceFinancials({
  baseLaborAmount = 0,
  lineItems = [],
  markupAmount = 0,
  taxRatePercent = 0
} = {}) {
  const { lineLabor, lineMaterials } = calculateLineItemTotals(lineItems);
  
  const laborAmount = roundCurrency(Number(baseLaborAmount || 0) + lineLabor);
  const materialsAmount = roundCurrency(lineMaterials + Number(markupAmount || 0));
  const subtotal = roundCurrency(laborAmount + materialsAmount);
  
  const taxRate = Math.max(0, Number(taxRatePercent || 0)) / 100;
  const taxAmount = roundCurrency(subtotal * taxRate);
  const totalAmount = roundCurrency(subtotal + taxAmount);

  return {
    laborAmount,
    materialsAmount,
    subtotal,
    taxAmount,
    totalAmount
  };
}

/**
 * Calculate job hours total cost.
 * @param {Array} hoursList
 * @param {number} hourlyRate
 * @returns {{ totalHours: number, totalLaborCost: number }}
 */
export function calculateJobHoursTotals(hoursList = [], hourlyRate = 0) {
  const totalHours = hoursList.reduce((sum, h) => sum + Number(h.hours || 0), 0);
  const totalLaborCost = roundCurrency(totalHours * Number(hourlyRate || 0));
  return {
    totalHours: roundCurrency(totalHours),
    totalLaborCost
  };
}

/**
 * Calculate job materials total cost.
 * @param {Array} materialsList
 * @returns {number} Total material cost
 */
export function calculateJobMaterialsTotals(materialsList = []) {
  const totalCost = materialsList.reduce((sum, m) => sum + Number(m.cost || 0), 0);
  return roundCurrency(totalCost);
}
