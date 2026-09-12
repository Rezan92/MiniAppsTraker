import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  normalizePhoneNumber,
  VALID_APPOINTMENT_STATUSES,
  VALID_CONTACT_ROLES,
  VALID_COLOR_TAGS
} from '../src/services/domain/appointmentService.js';
import {
  createAppointmentSchema,
  updateAppointmentSchema
} from '../src/routes/appointments.js';

test('appointmentService guards require tenantId for all operations', async () => {
  await assert.rejects(
    async () => {
      await getAppointments({ tenantId: null });
    },
    { message: 'Tenant context missing' }
  );

  await assert.rejects(
    async () => {
      await getAppointmentById({ tenantId: null, appointmentId: 'apt-1' });
    },
    { message: 'Tenant context missing' }
  );

  await assert.rejects(
    async () => {
      await createAppointment({ tenantId: null, appointmentData: { title: 'HVAC Inspection' } });
    },
    { message: 'Tenant context missing' }
  );

  await assert.rejects(
    async () => {
      await updateAppointment({ tenantId: null, appointmentId: 'apt-1', patchData: {} });
    },
    { message: 'Tenant context missing' }
  );

  await assert.rejects(
    async () => {
      await deleteAppointment({ tenantId: null, appointmentId: 'apt-1' });
    },
    { message: 'Tenant context missing' }
  );
});

test('createAppointment validates required fields and timestamp integrity', async () => {
  const tenantId = '00000000-0000-0000-0000-000000000001';

  // Missing or whitespace title
  await assert.rejects(
    async () => {
      await createAppointment({
        tenantId,
        appointmentData: { title: '   ', start_time: '2026-09-15T09:00:00Z', end_time: '2026-09-15T10:00:00Z' }
      });
    },
    /Appointment title is required/
  );

  // Missing start_time
  await assert.rejects(
    async () => {
      await createAppointment({
        tenantId,
        appointmentData: { title: 'Job Walkthrough', end_time: '2026-09-15T10:00:00Z' }
      });
    },
    /Start time and end time are required/
  );

  // Missing end_time
  await assert.rejects(
    async () => {
      await createAppointment({
        tenantId,
        appointmentData: { title: 'Job Walkthrough', start_time: '2026-09-15T09:00:00Z' }
      });
    },
    /Start time and end time are required/
  );

  // Invalid date format
  await assert.rejects(
    async () => {
      await createAppointment({
        tenantId,
        appointmentData: { title: 'Job Walkthrough', start_time: 'invalid-date', end_time: '2026-09-15T10:00:00Z' }
      });
    },
    /Invalid start or end timestamp format/
  );

  // Chronological violation: end_time before start_time
  await assert.rejects(
    async () => {
      await createAppointment({
        tenantId,
        appointmentData: {
          title: 'Job Walkthrough',
          start_time: '2026-09-15T14:00:00Z',
          end_time: '2026-09-15T13:00:00Z'
        }
      });
    },
    /Appointment end time cannot be earlier than start time/
  );
});

test('normalizePhoneNumber cleans formats and preserves leading +', () => {
  assert.equal(normalizePhoneNumber('(555) 123-4567'), '5551234567');
  assert.equal(normalizePhoneNumber('+1 (555) 987-6543'), '+15559876543');
  assert.equal(normalizePhoneNumber('555.432.1098'), '5554321098');
  assert.equal(normalizePhoneNumber('   +44 20 7946 0958   '), '+442079460958');
  assert.equal(normalizePhoneNumber(''), null);
  assert.equal(normalizePhoneNumber(null), null);
  assert.equal(normalizePhoneNumber(undefined), null);
});

test('VALID_* constants cover expected domain values', () => {
  assert.deepEqual(VALID_APPOINTMENT_STATUSES, [
    'scheduled',
    'in_progress',
    'completed',
    'cancelled',
    'rescheduled'
  ]);
  assert.deepEqual(VALID_CONTACT_ROLES, [
    'billing_client',
    'site_resident',
    'property_manager',
    'custom'
  ]);
  assert.deepEqual(VALID_COLOR_TAGS, [
    'berry',
    'flamingo',
    'tomato',
    'red',
    'tangerine',
    'pumpkin',
    'mango',
    'banana',
    'mustard',
    'avocado',
    'pistachio',
    'basil',
    'sage',
    'peacock',
    'sky',
    'blue',
    'blueberry',
    'indigo',
    'lavender',
    'wisteria',
    'grape',
    'cocoa',
    'graphite',
    'birch',
    'amber',
    'green',
    'purple',
    'gray'
  ]);
});

test('createAppointmentSchema validates and applies correct defaults', () => {
  const validPayload = {
    title: 'Site Inspection',
    start_time: '2026-09-15T09:00:00.000Z',
    end_time: '2026-09-15T11:00:00.000Z'
  };

  const parsed = createAppointmentSchema.safeParse(validPayload);
  assert.equal(parsed.success, true);
  assert.equal(parsed.data.title, 'Site Inspection');
  assert.equal(parsed.data.status, 'scheduled');
  assert.equal(parsed.data.color_tag, 'blue');
  assert.equal(parsed.data.contact_role, 'billing_client');
  assert.equal(parsed.data.reminder_minutes, 60);
  assert.equal(parsed.data.all_day, false);

  // Chronological violation in schema
  const invalidOrder = createAppointmentSchema.safeParse({
    title: 'Site Inspection',
    start_time: '2026-09-15T12:00:00.000Z',
    end_time: '2026-09-15T11:00:00.000Z'
  });
  assert.equal(invalidOrder.success, false);
  assert.equal(invalidOrder.error.issues[0].message, 'End time must be on or after start time');

  // Empty title
  const emptyTitle = createAppointmentSchema.safeParse({
    title: '   ',
    start_time: '2026-09-15T09:00:00.000Z',
    end_time: '2026-09-15T11:00:00.000Z'
  });
  assert.equal(emptyTitle.success, false);
});

test('updateAppointmentSchema allows partial fields and validates timestamp order when both provided', () => {
  const partialUpdate = {
    title: 'Updated Inspection Title',
    status: 'in_progress',
    color_tag: 'amber'
  };
  const parsed = updateAppointmentSchema.safeParse(partialUpdate);
  assert.equal(parsed.success, true);
  assert.equal(parsed.data.title, 'Updated Inspection Title');
  assert.equal(parsed.data.status, 'in_progress');
  assert.equal(parsed.data.color_tag, 'amber');

  // Partial update with single start_time is valid at schema level
  const singleTimeUpdate = updateAppointmentSchema.safeParse({
    start_time: '2026-09-15T10:00:00.000Z'
  });
  assert.equal(singleTimeUpdate.success, true);

  // Partial update with both times inverted must fail
  const invalidBothTimes = updateAppointmentSchema.safeParse({
    start_time: '2026-09-15T14:00:00.000Z',
    end_time: '2026-09-15T13:00:00.000Z'
  });
  assert.equal(invalidBothTimes.success, false);
  assert.equal(invalidBothTimes.error.issues[0].message, 'End time must be on or after start time');
});
