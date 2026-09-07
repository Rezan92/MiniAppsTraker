import test from 'node:test';
import assert from 'node:assert/strict';
import { roundCurrency, calculateLineItemTotals, calculateInvoiceFinancials } from '../src/services/pricingEngine.js';

test('roundCurrency correctly rounds floating point values to 2 decimal places', () => {
  assert.equal(roundCurrency(10.004), 10.00);
  assert.equal(roundCurrency(10.005), 10.01);
  assert.equal(roundCurrency(0.1 + 0.2), 0.30);
  assert.equal(roundCurrency(123.456), 123.46);
  assert.equal(roundCurrency(undefined), 0);
  assert.equal(roundCurrency(null), 0);
  assert.equal(roundCurrency('45.55'), 45.55);
});

test('calculateLineItemTotals separates labor and materials and excludes non-billable items', () => {
  const items = [
    { source_type: 'labor', amount: 50.00, is_billable: true },
    { source_type: 'labor', amount: 25.50, is_billable: true },
    { source_type: 'ad_hoc', amount: 15.00, is_billable: true },
    { source_type: 'material', amount: 100.25, is_billable: true },
    { source_type: 'material', amount: 40.00, is_billable: false } // Non-billable excluded
  ];

  const totals = calculateLineItemTotals(items);
  assert.equal(totals.lineLabor, 90.50); // 50 + 25.50 + 15
  assert.equal(totals.lineMaterials, 100.25);
  assert.equal(totals.billableTotal, 190.75);
});

test('calculateInvoiceFinancials computes deterministic labor, materials, tax, and total', () => {
  const lineItems = [
    { source_type: 'labor', amount: 150.00, is_billable: true },
    { source_type: 'material', amount: 50.00, is_billable: true }
  ];

  const financials = calculateInvoiceFinancials({
    baseLaborAmount: 100.00,
    lineItems,
    markupAmount: 10.00,
    taxRatePercent: 8.25
  });

  // Base labor (100) + line labor (150) = 250
  assert.equal(financials.laborAmount, 250.00);
  // Line materials (50) + markup (10) = 60
  assert.equal(financials.materialsAmount, 60.00);
  // Subtotal = 250 + 60 = 310
  assert.equal(financials.subtotal, 310.00);
  // Tax = 310 * 0.0825 = 25.575 -> 25.58
  assert.equal(financials.taxAmount, 25.58);
  // Total = 310 + 25.58 = 335.58
  assert.equal(financials.totalAmount, 335.58);
});

test('calculateInvoiceFinancials eliminates labor doubling for hourly jobs with baseLaborAmount 0', () => {
  // Scenario: 2.5 hours @ $65/hr = $162.50
  const lineItems = [
    { source_type: 'labor', description: '2.5 hours logged', amount: 162.50, is_billable: true }
  ];

  const financials = calculateInvoiceFinancials({
    baseLaborAmount: 0,
    lineItems
  });

  assert.equal(financials.laborAmount, 162.50);
  assert.equal(financials.materialsAmount, 0.00);
  assert.equal(financials.totalAmount, 162.50);
});

test('calculateInvoiceFinancials handles flat-rate job with non-billable reference items and flat-rate ad-hoc item', () => {
  // Scenario: $500 flat rate job with 3 hours logged ($0 non-billable reference) and $45 material ($0 non-billable reference)
  const lineItems = [
    { source_type: 'ad_hoc', description: 'Flat Rate: Electrical panel upgrade', amount: 500.00, is_billable: true },
    { source_type: 'labor', description: '3.0 hours logged', amount: 0, is_billable: false },
    { source_type: 'material', description: 'Wire nuts and conduit', amount: 45.00, is_billable: false }
  ];

  const financials = calculateInvoiceFinancials({
    baseLaborAmount: 0,
    lineItems
  });

  assert.equal(financials.laborAmount, 500.00);
  assert.equal(financials.materialsAmount, 0.00);
  assert.equal(financials.totalAmount, 500.00);
});

test('calculateInvoiceFinancials correctly adds billable extra work to a flat-rate job', () => {
  // Scenario: $500 flat rate job + $80 extra custom labor charged + $35 billable material
  const lineItems = [
    { source_type: 'ad_hoc', description: 'Flat Rate: Job Service', amount: 500.00, is_billable: true },
    { source_type: 'labor', description: 'Extra troubleshooting', amount: 80.00, is_billable: true },
    { source_type: 'material', description: 'Specialty Breaker', amount: 35.00, is_billable: true }
  ];

  const financials = calculateInvoiceFinancials({
    baseLaborAmount: 0,
    lineItems
  });

  assert.equal(financials.laborAmount, 580.00);
  assert.equal(financials.materialsAmount, 35.00);
  assert.equal(financials.totalAmount, 615.00);
});
