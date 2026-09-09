import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  createJob, 
  updateJob, 
  updateJobStatus, 
  deleteJob, 
  logJobHours, 
  updateJobHours,
  deleteJobHours,
  logJobMaterials,
  updateJobMaterials,
  deleteJobMaterials,
  logJobMaterialsBatch,
  normalizeTimeTo24Hour,
  addHoursToTime,
  GENERIC_LABOR_PLACEHOLDERS,
  GENERIC_MATERIAL_PLACEHOLDERS
} from '../src/services/domain/jobService.js';

test('jobService guards require tenantId for all operations', async () => {
  await assert.rejects(
    async () => {
      await createJob({ tenantId: null, jobData: {} });
    },
    { message: 'Tenant context missing' }
  );

  await assert.rejects(
    async () => {
      await updateJob({ tenantId: null, jobId: 'j-1', updateData: {} });
    },
    { message: 'Tenant context missing' }
  );

  await assert.rejects(
    async () => {
      await updateJobStatus({ tenantId: null, jobId: 'j-1', status: 'completed' });
    },
    { message: 'Tenant context missing' }
  );

  await assert.rejects(
    async () => {
      await deleteJob({ tenantId: null, jobId: 'j-1' });
    },
    { message: 'Tenant context missing' }
  );

  await assert.rejects(
    async () => {
      await logJobHours({ tenantId: null, jobId: 'j-1', hoursData: {} });
    },
    { message: 'Tenant context missing' }
  );

  await assert.rejects(
    async () => {
      await logJobMaterials({ tenantId: null, jobId: 'j-1', materialData: {} });
    },
    { message: 'Tenant context missing' }
  );

  await assert.rejects(
    async () => {
      await updateJobHours({ tenantId: null, jobId: 'j-1', hourId: 'h-1', updateData: {} });
    },
    { message: 'Tenant context missing' }
  );

  await assert.rejects(
    async () => {
      await deleteJobHours({ tenantId: null, jobId: 'j-1', hourId: 'h-1' });
    },
    { message: 'Tenant context missing' }
  );

  await assert.rejects(
    async () => {
      await updateJobMaterials({ tenantId: null, jobId: 'j-1', materialId: 'm-1', updateData: {} });
    },
    { message: 'Tenant context missing' }
  );

  await assert.rejects(
    async () => {
      await deleteJobMaterials({ tenantId: null, jobId: 'j-1', materialId: 'm-1' });
    },
    { message: 'Tenant context missing' }
  );
});

test('normalizeTimeTo24Hour handles various 12-hour and 24-hour formats', () => {
  assert.equal(normalizeTimeTo24Hour('8:30 AM'), '08:30');
  assert.equal(normalizeTimeTo24Hour('08:30 AM'), '08:30');
  assert.equal(normalizeTimeTo24Hour('2:15 PM'), '14:15');
  assert.equal(normalizeTimeTo24Hour('12:00 AM'), '00:00');
  assert.equal(normalizeTimeTo24Hour('12:30 PM'), '12:30');
  assert.equal(normalizeTimeTo24Hour('14:45'), '14:45');
  assert.equal(normalizeTimeTo24Hour('01:00:00'), '01:00');
  assert.equal(normalizeTimeTo24Hour('invalid'), null);
  assert.equal(normalizeTimeTo24Hour(null), null);
});

test('addHoursToTime correctly adds hours across midday and midnight', () => {
  assert.equal(addHoursToTime('08:00', 3.5), '11:30');
  assert.equal(addHoursToTime('01:00', 4), '05:00');
  assert.equal(addHoursToTime('22:00', 3), '01:00'); // wraps around midnight
  assert.equal(addHoursToTime('09:15', 1.75), '11:00');
});

test('updateJobStatus validates allowed status enum', async () => {
  await assert.rejects(
    async () => {
      await updateJobStatus({ tenantId: 't-1', jobId: 'j-1', status: 'invalid_status' });
    },
    /Invalid status: invalid_status/
  );
});

test('materialSchema accepts valid material payloads with or without invoice_id', async () => {
  const { materialSchema } = await import('../src/routes/jobs.js');
  
  // Without invoice_id
  const parsed1 = materialSchema.safeParse({
    description: 'Drywall screws',
    cost: 15.50,
    store: 'Home Depot',
    purchase_date: '2026-09-07'
  });
  assert.equal(parsed1.success, true);

  // With valid UUID invoice_id
  const parsed2 = materialSchema.safeParse({
    description: 'Drywall screws',
    cost: 15.50,
    store: 'Home Depot',
    purchase_date: '2026-09-07',
    invoice_id: 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d'
  });
  assert.equal(parsed2.success, true);
  assert.equal(parsed2.data.invoice_id, 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d');

  // With null invoice_id
  const parsed3 = materialSchema.safeParse({
    description: 'Drywall screws',
    cost: 15.50,
    invoice_id: null
  });
  assert.equal(parsed3.success, true);
});

test('jobHoursSchema accepts valid hours payloads with or without invoice_id', async () => {
  const { jobHoursSchema } = await import('../src/routes/jobs.js');

  // Without invoice_id
  const parsed1 = jobHoursSchema.safeParse({
    date: '2026-09-07',
    hours: 2.5,
    description: 'Installed new subfloor'
  });
  assert.equal(parsed1.success, true);

  // With valid UUID invoice_id
  const parsed2 = jobHoursSchema.safeParse({
    date: '2026-09-07',
    hours: 2.5,
    description: 'Installed new subfloor',
    invoice_id: 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d'
  });
  assert.equal(parsed2.success, true);
  assert.equal(parsed2.data.invoice_id, 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d');

  // With null invoice_id
  const parsed3 = jobHoursSchema.safeParse({
    date: '2026-09-07',
    hours: 2.5,
    description: 'Installed new subfloor',
    invoice_id: null
  });
  assert.equal(parsed3.success, true);
});

test('logJobMaterialsBatch guards enforce tenantId, jobId, non-empty items, and valid item rows', async () => {
  // Missing tenantId
  await assert.rejects(
    async () => {
      await logJobMaterialsBatch({ tenantId: null, jobId: 'j-1', items: [{ description: 'Stud', cost: 10 }] });
    },
    { message: 'Tenant context missing' }
  );

  // Missing jobId
  await assert.rejects(
    async () => {
      await logJobMaterialsBatch({ tenantId: 't-1', jobId: null, items: [{ description: 'Stud', cost: 10 }] });
    },
    { message: 'Job ID is required' }
  );

  // Empty items array
  await assert.rejects(
    async () => {
      await logJobMaterialsBatch({ tenantId: 't-1', jobId: 'j-1', items: [] });
    },
    { message: 'At least one material item is required' }
  );
});

