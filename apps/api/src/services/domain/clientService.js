import { supabase } from '../../config/supabase.js';

function assertTenant(tenantId) {
  if (!tenantId) {
    const err = new Error('Tenant context missing');
    err.status = 400;
    err.code = 'TENANT_REQUIRED';
    throw err;
  }
}

/**
 * Normalizes phone numbers to standard digits and optional leading +.
 * @param {string|null|undefined} phone
 * @returns {string|null}
 */
export function normalizePhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') return null;
  const cleaned = phone.replace(/[^\d+]/g, '');
  return cleaned || null;
}

/**
 * Normalizes and lowercases email addresses.
 * @param {string|null|undefined} email
 * @returns {string|null}
 */
export function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return null;
  const trimmed = email.trim().toLowerCase();
  return trimmed || null;
}

/**
 * Creates a new client profile with sanitization and tenant isolation.
 * Used by manual REST POST /api/clients and AI tool create_client.
 * @param {Object} params
 * @param {string} params.tenantId
 * @param {string} [params.userId]
 * @param {Object} params.clientData
 * @returns {Promise<Object>} Created client record
 */
export async function createClient({ tenantId, userId, clientData }) {
  assertTenant(tenantId);
  if (!clientData?.name || !clientData.name.trim()) {
    const err = new Error('Client name is required');
    err.status = 400;
    err.code = 'BAD_REQUEST';
    throw err;
  }

  const cleanName = clientData.name.trim();
  const cleanEmail = normalizeEmail(clientData.email);
  const cleanPhone = normalizePhoneNumber(clientData.phone);
  const cleanAddress = clientData.address?.trim() || null;
  const cleanCompany = clientData.company_name?.trim() || null;
  const cleanNotes = clientData.notes || null;
  const clientType = ['residential', 'commercial', 'property_manager'].includes(clientData.client_type)
    ? clientData.client_type
    : 'residential';
  const status = ['active', 'inactive'].includes(clientData.status) ? clientData.status : 'active';

  const insertPayload = {
    tenant_id: tenantId,
    name: cleanName,
    client_type: clientType,
    company_name: cleanCompany,
    email: cleanEmail,
    phone: cleanPhone,
    address: cleanAddress,
    notes: cleanNotes,
    status
  };

  const { data, error } = await supabase
    .from('clients')
    .insert([insertPayload])
    .select()
    .single();

  if (error) throw error;
  if (!data) {
    const err = new Error('Failed to create client record');
    err.status = 500;
    err.code = 'DATABASE_ERROR';
    throw err;
  }
  return data;
}

/**
 * Updates an existing client profile with sanitization and tenant isolation.
 * Used by manual REST PUT/PATCH /api/clients/:id and AI tool update_client.
 * @param {Object} params
 * @param {string} params.tenantId
 * @param {string} [params.userId]
 * @param {string} params.clientId
 * @param {Object} params.updateData
 * @returns {Promise<Object>} Updated client record
 */
export async function updateClient({ tenantId, userId, clientId, updateData }) {
  assertTenant(tenantId);
  if (!clientId) {
    const err = new Error('Client ID is required');
    err.status = 400;
    throw err;
  }

  // Check existing client
  const { data: existing, error: existErr } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .eq('tenant_id', tenantId)
    .single();

  if (existErr || !existing) {
    const err = new Error('Client not found or update failed');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const patch = {};
  if (updateData.name !== undefined) {
    const trimmed = updateData.name.trim();
    if (!trimmed) {
      const err = new Error('Client name cannot be empty');
      err.status = 400;
      throw err;
    }
    patch.name = trimmed;
  }

  if (updateData.email !== undefined) {
    patch.email = normalizeEmail(updateData.email);
  }

  if (updateData.phone !== undefined) {
    patch.phone = normalizePhoneNumber(updateData.phone);
  }

  if (updateData.address !== undefined) {
    patch.address = updateData.address ? updateData.address.trim() : null;
  }

  if (updateData.company_name !== undefined) {
    patch.company_name = updateData.company_name ? updateData.company_name.trim() : null;
  }

  if (updateData.notes !== undefined) {
    patch.notes = updateData.notes || null;
  }

  if (updateData.client_type !== undefined) {
    if (['residential', 'commercial', 'property_manager'].includes(updateData.client_type)) {
      patch.client_type = updateData.client_type;
    }
  }

  if (updateData.status !== undefined) {
    if (['active', 'inactive'].includes(updateData.status)) {
      patch.status = updateData.status;
    }
  }

  const { data, error } = await supabase
    .from('clients')
    .update(patch)
    .eq('id', clientId)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Safely deletes a client, ensuring no active or paid invoices are cascaded.
 * Used by manual REST DELETE /api/clients/:id and AI action confirm delete_client.
 * @param {Object} params
 * @param {string} params.tenantId
 * @param {string} [params.userId]
 * @param {string} params.clientId
 * @returns {Promise<{ success: boolean, deletedClientId: string }>}
 */
export async function deleteClient({ tenantId, userId, clientId }) {
  assertTenant(tenantId);
  if (!clientId) {
    const err = new Error('Client ID is required');
    err.status = 400;
    throw err;
  }

  const { data: existing, error: existErr } = await supabase
    .from('clients')
    .select('id, name')
    .eq('id', clientId)
    .eq('tenant_id', tenantId)
    .single();

  if (existErr || !existing) {
    const err = new Error('Client not found or already deleted');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  // Guard against deleting clients with active or paid invoices
  const { data: invoices, error: invErr } = await supabase
    .from('invoices')
    .select('status')
    .eq('client_id', clientId)
    .eq('tenant_id', tenantId);

  if (invErr) throw invErr;
  if (invoices && invoices.some(inv => inv.status === 'paid' || inv.status === 'in_progress')) {
    const err = new Error('Cannot delete a client that has paid or in-progress invoices.');
    err.status = 403;
    err.code = 'CLIENT_HAS_ACTIVE_INVOICES';
    throw err;
  }

  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', clientId)
    .eq('tenant_id', tenantId);

  if (error) throw error;
  return { success: true, deletedClientId: clientId };
}
