import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createClient,
  updateClient,
  deleteClient,
  normalizePhoneNumber,
  normalizeEmail
} from '../src/services/domain/clientService.js';
import { clientSchema } from '../src/routes/clients.js';

test('clientService guards require tenantId for all operations', async () => {
  await assert.rejects(
    async () => {
      await createClient({ tenantId: null, clientData: { name: 'Acme Corp' } });
    },
    { message: 'Tenant context missing' }
  );

  await assert.rejects(
    async () => {
      await updateClient({ tenantId: null, clientId: 'c-1', updateData: {} });
    },
    { message: 'Tenant context missing' }
  );

  await assert.rejects(
    async () => {
      await deleteClient({ tenantId: null, clientId: 'c-1' });
    },
    { message: 'Tenant context missing' }
  );
});

test('createClient requires a valid non-empty client name', async () => {
  await assert.rejects(
    async () => {
      await createClient({ tenantId: 't-1', clientData: { name: '   ' } });
    },
    /Client name is required/
  );
});

test('normalizePhoneNumber sanitizes formatting while preserving + prefix', () => {
  assert.equal(normalizePhoneNumber('(555) 123-4567'), '5551234567');
  assert.equal(normalizePhoneNumber('+1 (555) 987-6543'), '+15559876543');
  assert.equal(normalizePhoneNumber('555.432.1098'), '5554321098');
  assert.equal(normalizePhoneNumber(''), null);
  assert.equal(normalizePhoneNumber(null), null);
});

test('normalizeEmail trims and lowercases addresses', () => {
  assert.equal(normalizeEmail('  John.Doe@EXAMPLE.com  '), 'john.doe@example.com');
  assert.equal(normalizeEmail('HELLO@test.org'), 'hello@test.org');
  assert.equal(normalizeEmail(''), null);
  assert.equal(normalizeEmail(null), null);
});

test('clientSchema accepts client names containing numbers and business punctuation', () => {
  const validNames = [
    'Unit 402 LLC',
    'Apartment 304',
    'Building 5 LLC',
    '3M Corp',
    'Smith & Jones Co.',
    'Suite #10 / Bldg 2',
    "O'Connor's Repair-Shop"
  ];

  for (const name of validNames) {
    const parsed = clientSchema.safeParse({ name });
    assert.equal(parsed.success, true, `Expected "${name}" to be accepted`);
    assert.equal(parsed.data.name, name);
  }

  // Blank whitespace must be rejected
  const whitespaceOnly = clientSchema.safeParse({ name: '   ' });
  assert.equal(whitespaceOnly.success, false, 'Expected whitespace-only name to fail');

  // Empty string must be rejected
  const emptyName = clientSchema.safeParse({ name: '' });
  assert.equal(emptyName.success, false, 'Expected empty string name to fail');
});

