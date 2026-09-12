import test from 'node:test';
import assert from 'node:assert/strict';
import { entityResolver } from '../src/services/ai/entityResolver.js';

test('entityResolver guards require tenantId and identifier', async () => {
  const clientRes = await entityResolver.resolveClient(null, 'tenant-1');
  assert.equal(clientRes.status, 'not_found');

  const clientNoTenant = await entityResolver.resolveClient('John', null);
  assert.equal(clientNoTenant.status, 'not_found');

  const jobRes = await entityResolver.resolveJob(null, 'tenant-1');
  assert.equal(jobRes.status, 'not_found');

  const jobNoTenant = await entityResolver.resolveJob('Remodel', null);
  assert.equal(jobNoTenant.status, 'not_found');

  const invoiceRes = await entityResolver.resolveInvoice(null, 'tenant-1');
  assert.equal(invoiceRes.status, 'not_found');

  const matRes = await entityResolver.resolveJobMaterial(null, 'job-1', 'tenant-1');
  assert.equal(matRes.status, 'not_found');

  const matNoJob = await entityResolver.resolveJobMaterial('bucket', null, 'tenant-1');
  assert.equal(matNoJob.status, 'not_found');

  const matNoTenant = await entityResolver.resolveJobMaterial('bucket', 'job-1', null);
  assert.equal(matNoTenant.status, 'not_found');

  const hourRes = await entityResolver.resolveJobHour(null, null, 'tenant-1');
  assert.equal(hourRes.status, 'not_found');

  const hourNoTenant = await entityResolver.resolveJobHour('drywall', 'job-1', null);
  assert.equal(hourNoTenant.status, 'not_found');

  const aptRes = await entityResolver.resolveAppointment(null, 'tenant-1');
  assert.equal(aptRes.status, 'not_found');

  const aptNoTenant = await entityResolver.resolveAppointment('Inspection', null);
  assert.equal(aptNoTenant.status, 'not_found');
});
