import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createClient,
  updateClient,
  deleteClient,
  normalizePhoneNumber,
  normalizeEmail
} from '../src/services/domain/clientService.js';

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
