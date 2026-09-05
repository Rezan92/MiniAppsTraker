import test from 'node:test';
import assert from 'node:assert/strict';
import { enforceInvoiceEditability, createInvoice, draftInvoiceFromJob, deleteDraftInvoice } from '../src/services/domain/invoiceService.js';

test('invoiceService guards require tenantId for all operations', async () => {
  await assert.rejects(
    async () => {
      await createInvoice({ tenantId: null, invoiceData: {} });
    },
    { message: 'Tenant context missing' }
  );

  await assert.rejects(
    async () => {
      await draftInvoiceFromJob({ tenantId: null });
    },
    { message: 'Tenant context missing' }
  );

  await assert.rejects(
    async () => {
      await deleteDraftInvoice({ tenantId: null, invoiceId: 'test-id' });
    },
    { message: 'Tenant context missing' }
  );
});

test('draftInvoiceFromJob requires valid client or job', async () => {
  await assert.rejects(
    async () => {
      await draftInvoiceFromJob({ tenantId: 'test-tenant', clientId: null, jobId: null });
    },
    { message: 'A valid client or job is required to draft an invoice.' }
  );
});
