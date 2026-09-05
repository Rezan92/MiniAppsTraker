import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  createJob, 
  updateJob, 
  updateJobStatus, 
  deleteJob, 
  logJobHours, 
  logJobMaterials,
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
