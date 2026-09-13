import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseAppointmentTimeToUtc,
  formatAppointmentForAi
} from '../src/services/ai/aiToolExecutors.js';

test('parseAppointmentTimeToUtc converts local naive timestamps to accurate UTC ISO strings', () => {
  // Chicago (UTC-5 in Sep / Daylight Savings CDT)
  const chicagoUtc = parseAppointmentTimeToUtc('2026-09-13 14:00:00', 'America/Chicago');
  assert.equal(chicagoUtc, '2026-09-13T19:00:00.000Z');

  // New York (UTC-4 in Sep / EDT)
  const nyUtc = parseAppointmentTimeToUtc('2026-09-13 14:00:00', 'America/New_York');
  assert.equal(nyUtc, '2026-09-13T18:00:00.000Z');

  // London (UTC+1 in Sep / BST)
  const londonUtc = parseAppointmentTimeToUtc('2026-09-13 14:00:00', 'Europe/London');
  assert.equal(londonUtc, '2026-09-13T13:00:00.000Z');

  // UTC timezone
  const utc = parseAppointmentTimeToUtc('2026-09-13 14:00:00', 'UTC');
  assert.equal(utc, '2026-09-13T14:00:00.000Z');
});

test('parseAppointmentTimeToUtc handles LLM appended Z to local time gracefully', () => {
  // If LLM blindly provides 14:00:00Z for 2 PM local time in Chicago
  const res = parseAppointmentTimeToUtc('2026-09-13T14:00:00Z', 'America/Chicago');
  assert.equal(res, '2026-09-13T19:00:00.000Z');

  // 9 AM local in Chicago
  const morningRes = parseAppointmentTimeToUtc('2026-09-13T09:00:00Z', 'America/Chicago');
  assert.equal(morningRes, '2026-09-13T14:00:00.000Z');
});

test('parseAppointmentTimeToUtc preserves explicit numeric offsets', () => {
  const explicitOffset = parseAppointmentTimeToUtc('2026-09-13T14:00:00-05:00', 'America/Chicago');
  assert.equal(explicitOffset, '2026-09-13T19:00:00.000Z');
});

test('parseAppointmentTimeToUtc handles date boundaries with isEndOfDay flag', () => {
  // Start of day in Chicago: 00:00:00 CDT is 05:00:00 UTC
  const startOfDay = parseAppointmentTimeToUtc('2026-09-13', 'America/Chicago', false);
  assert.equal(startOfDay, '2026-09-13T05:00:00.000Z');

  // End of day in Chicago: 23:59:59.999 CDT is next day 04:59:59.999 UTC
  const endOfDay = parseAppointmentTimeToUtc('2026-09-13', 'America/Chicago', true);
  assert.equal(endOfDay, '2026-09-14T04:59:59.999Z');
});

test('formatAppointmentForAi produces localized times and human schedule strings', () => {
  const mockApt = {
    id: 'apt-1',
    title: 'Roof Inspection',
    start_time: '2026-09-13T19:00:00.000Z',
    end_time: '2026-09-13T20:00:00.000Z',
    all_day: false
  };

  const formatted = formatAppointmentForAi(mockApt, 'America/Chicago');
  assert.equal(formatted.local_start_time, '2026-09-13 14:00:00');
  assert.equal(formatted.local_end_time, '2026-09-13 15:00:00');
  assert.match(formatted.local_formatted_schedule, /Sun, Sep 13, 2026.*2:00 PM.*3:00 PM/);
  assert.equal(formatted.user_timezone, 'America/Chicago');
});
