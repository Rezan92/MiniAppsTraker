import { supabase } from '../../config/supabase.js';

export const VALID_APPOINTMENT_STATUSES = [
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
  'rescheduled'
];

export const VALID_CONTACT_ROLES = [
  'billing_client',
  'site_resident',
  'property_manager',
  'custom'
];

export const VALID_COLOR_TAGS = [
  // Google Calendar 24-color palette
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
  // Legacy aliases for backward compatibility
  'amber',
  'green',
  'purple',
  'gray'
];

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

const APPOINTMENT_SELECT_FIELDS = `
  id,
  tenant_id,
  user_id,
  job_id,
  client_id,
  property_id,
  title,
  description,
  start_time,
  end_time,
  all_day,
  status,
  color_tag,
  location_address,
  contact_name,
  contact_phone,
  contact_role,
  reminder_minutes,
  reminder_sent,
  created_at,
  updated_at,
  client:clients(id, name, email, phone, company_name, address),
  job:jobs(id, title, status, rate_type, client_id, property_id),
  property:rental_properties(id, name, address, renter_name, renter_phone)
`;

/**
 * Retrieves appointments for a tenant, bounded by date range or linked entities.
 * Uses interval overlap (start_time <= endDate AND end_time >= startDate) to capture
 * multi-day or overnight appointments spanning the viewport.
 * @param {Object} params
 * @param {string} params.tenantId
 * @param {string} [params.startDate] - ISO start date/time
 * @param {string} [params.endDate] - ISO end date/time
 * @param {string} [params.jobId] - Filter by job UUID
 * @param {string} [params.clientId] - Filter by client UUID
 * @param {string} [params.status] - Filter by status
 * @returns {Promise<Array<Object>>}
 */
export async function getAppointments({
  tenantId,
  startDate,
  endDate,
  jobId,
  clientId,
  status
}) {
  assertTenant(tenantId);

  let query = supabase
    .from('appointments')
    .select(APPOINTMENT_SELECT_FIELDS)
    .eq('tenant_id', tenantId);

  // Interval overlap: appointment starts on/before window end AND ends on/after window start
  if (startDate) {
    query = query.gte('end_time', startDate);
  }
  if (endDate) {
    query = query.lte('start_time', endDate);
  }

  if (jobId) {
    query = query.eq('job_id', jobId);
  }
  if (clientId) {
    query = query.eq('client_id', clientId);
  }
  if (status) {
    if (VALID_APPOINTMENT_STATUSES.includes(status)) {
      query = query.eq('status', status);
    }
  }

  query = query.order('start_time', { ascending: true });

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching appointments:', error);
    const err = new Error(error.message || 'Failed to fetch appointments');
    err.status = 500;
    err.code = 'DATABASE_ERROR';
    throw err;
  }

  return data || [];
}

/**
 * Retrieves a single appointment by ID with full relational joins.
 * @param {Object} params
 * @param {string} params.tenantId
 * @param {string} params.appointmentId
 * @returns {Promise<Object>}
 */
export async function getAppointmentById({ tenantId, appointmentId }) {
  assertTenant(tenantId);

  if (!appointmentId) {
    const err = new Error('Appointment ID is required');
    err.status = 400;
    err.code = 'BAD_REQUEST';
    throw err;
  }

  const { data, error } = await supabase
    .from('appointments')
    .select(APPOINTMENT_SELECT_FIELDS)
    .eq('tenant_id', tenantId)
    .eq('id', appointmentId)
    .single();

  if (error || !data) {
    const err = new Error('Appointment not found');
    err.status = 404;
    err.code = 'APPOINTMENT_NOT_FOUND';
    throw err;
  }

  return data;
}

/**
 * Creates a new appointment with smart contact and location inheritance.
 * @param {Object} params
 * @param {string} params.tenantId
 * @param {string} [params.userId]
 * @param {Object} params.appointmentData
 * @returns {Promise<Object>} Created appointment record
 */
export async function createAppointment({ tenantId, userId, appointmentData }) {
  assertTenant(tenantId);

  if (!appointmentData?.title || !appointmentData.title.trim()) {
    const err = new Error('Appointment title is required');
    err.status = 400;
    err.code = 'BAD_REQUEST';
    throw err;
  }

  if (!appointmentData.start_time || !appointmentData.end_time) {
    const err = new Error('Start time and end time are required');
    err.status = 400;
    err.code = 'BAD_REQUEST';
    throw err;
  }

  const startMs = new Date(appointmentData.start_time).getTime();
  const endMs = new Date(appointmentData.end_time).getTime();

  if (isNaN(startMs) || isNaN(endMs)) {
    const err = new Error('Invalid start or end timestamp format');
    err.status = 400;
    err.code = 'INVALID_TIMESTAMP';
    throw err;
  }

  if (endMs < startMs) {
    const err = new Error('Appointment end time cannot be earlier than start time');
    err.status = 400;
    err.code = 'INVALID_DATE_ORDER';
    throw err;
  }

  const status = VALID_APPOINTMENT_STATUSES.includes(appointmentData.status)
    ? appointmentData.status
    : 'scheduled';

  const contactRole = VALID_CONTACT_ROLES.includes(appointmentData.contact_role)
    ? appointmentData.contact_role
    : 'billing_client';

  const colorTag = VALID_COLOR_TAGS.includes(appointmentData.color_tag)
    ? appointmentData.color_tag
    : 'blue';

  const allDay = Boolean(appointmentData.all_day);
  const reminderMinutes = typeof appointmentData.reminder_minutes === 'number' && appointmentData.reminder_minutes >= 0
    ? Math.round(appointmentData.reminder_minutes)
    : 60;

  let contactName = appointmentData.contact_name?.trim() || null;
  let contactPhone = normalizePhoneNumber(appointmentData.contact_phone);
  let locationAddress = appointmentData.location_address?.trim() || null;

  // Smart Contact & Location Inheritance:
  // If contact info or location is omitted, auto-resolve from linked property or client
  if (appointmentData.property_id && (!contactName || !locationAddress)) {
    const { data: prop } = await supabase
      .from('rental_properties')
      .select('name, address, renter_name, renter_phone')
      .eq('tenant_id', tenantId)
      .eq('id', appointmentData.property_id)
      .single();

    if (prop) {
      if (!locationAddress && prop.address) {
        locationAddress = prop.address;
      }
      if (contactRole === 'site_resident' && !contactName && prop.renter_name) {
        contactName = prop.renter_name;
        if (!contactPhone && prop.renter_phone) {
          contactPhone = normalizePhoneNumber(prop.renter_phone);
        }
      }
    }
  }

  if (appointmentData.client_id && (!contactName || !locationAddress)) {
    const { data: client } = await supabase
      .from('clients')
      .select('name, phone, address')
      .eq('tenant_id', tenantId)
      .eq('id', appointmentData.client_id)
      .single();

    if (client) {
      if (!locationAddress && client.address) {
        locationAddress = client.address;
      }
      if (contactRole === 'billing_client' && !contactName && client.name) {
        contactName = client.name;
        if (!contactPhone && client.phone) {
          contactPhone = normalizePhoneNumber(client.phone);
        }
      }
    }
  }

  const payload = {
    tenant_id: tenantId,
    user_id: userId || appointmentData.user_id || null,
    job_id: appointmentData.job_id || null,
    client_id: appointmentData.client_id || null,
    property_id: appointmentData.property_id || null,
    title: appointmentData.title.trim(),
    description: appointmentData.description?.trim() || null,
    start_time: new Date(appointmentData.start_time).toISOString(),
    end_time: new Date(appointmentData.end_time).toISOString(),
    all_day: allDay,
    status,
    color_tag: colorTag,
    location_address: locationAddress,
    contact_name: contactName,
    contact_phone: contactPhone,
    contact_role: contactRole,
    reminder_minutes: reminderMinutes,
    reminder_sent: false
  };

  const { data, error } = await supabase
    .from('appointments')
    .insert(payload)
    .select(APPOINTMENT_SELECT_FIELDS)
    .single();

  if (error || !data) {
    console.error('Error inserting appointment:', error);
    const err = new Error(error?.message || 'Failed to create appointment');
    err.status = 500;
    err.code = 'DATABASE_ERROR';
    throw err;
  }

  return data;
}

/**
 * Updates an appointment with partial patch data, preserving temporal order.
 * @param {Object} params
 * @param {string} params.tenantId
 * @param {string} [params.userId]
 * @param {string} params.appointmentId
 * @param {Object} params.patchData
 * @returns {Promise<Object>} Updated appointment record
 */
export async function updateAppointment({
  tenantId,
  userId,
  appointmentId,
  patchData
}) {
  assertTenant(tenantId);

  if (!appointmentId) {
    const err = new Error('Appointment ID is required');
    err.status = 400;
    err.code = 'BAD_REQUEST';
    throw err;
  }

  // Verify existing appointment exists for this tenant
  const existing = await getAppointmentById({ tenantId, appointmentId });

  const startCandidate = patchData.start_time !== undefined ? patchData.start_time : existing.start_time;
  const endCandidate = patchData.end_time !== undefined ? patchData.end_time : existing.end_time;

  const startMs = new Date(startCandidate).getTime();
  const endMs = new Date(endCandidate).getTime();

  if (isNaN(startMs) || isNaN(endMs)) {
    const err = new Error('Invalid start or end timestamp format');
    err.status = 400;
    err.code = 'INVALID_TIMESTAMP';
    throw err;
  }

  if (endMs < startMs) {
    const err = new Error('Appointment end time cannot be earlier than start time');
    err.status = 400;
    err.code = 'INVALID_DATE_ORDER';
    throw err;
  }

  const updatePayload = {
    updated_at: new Date().toISOString()
  };

  if (patchData.title !== undefined) {
    if (!patchData.title || !patchData.title.trim()) {
      const err = new Error('Appointment title cannot be empty');
      err.status = 400;
      err.code = 'BAD_REQUEST';
      throw err;
    }
    updatePayload.title = patchData.title.trim();
  }

  if (patchData.description !== undefined) {
    updatePayload.description = patchData.description?.trim() || null;
  }

  if (patchData.start_time !== undefined) {
    updatePayload.start_time = new Date(patchData.start_time).toISOString();
  }

  if (patchData.end_time !== undefined) {
    updatePayload.end_time = new Date(patchData.end_time).toISOString();
  }

  if (patchData.all_day !== undefined) {
    updatePayload.all_day = Boolean(patchData.all_day);
  }

  if (patchData.status !== undefined) {
    if (!VALID_APPOINTMENT_STATUSES.includes(patchData.status)) {
      const err = new Error(`Invalid status. Must be one of: ${VALID_APPOINTMENT_STATUSES.join(', ')}`);
      err.status = 400;
      err.code = 'INVALID_STATUS';
      throw err;
    }
    updatePayload.status = patchData.status;
  }

  if (patchData.color_tag !== undefined) {
    if (!VALID_COLOR_TAGS.includes(patchData.color_tag)) {
      const err = new Error(`Invalid color tag. Must be one of: ${VALID_COLOR_TAGS.join(', ')}`);
      err.status = 400;
      err.code = 'INVALID_COLOR';
      throw err;
    }
    updatePayload.color_tag = patchData.color_tag;
  }

  if (patchData.contact_role !== undefined) {
    if (!VALID_CONTACT_ROLES.includes(patchData.contact_role)) {
      const err = new Error(`Invalid contact role. Must be one of: ${VALID_CONTACT_ROLES.join(', ')}`);
      err.status = 400;
      err.code = 'INVALID_ROLE';
      throw err;
    }
    updatePayload.contact_role = patchData.contact_role;
  }

  if (patchData.contact_name !== undefined) {
    updatePayload.contact_name = patchData.contact_name?.trim() || null;
  }

  if (patchData.contact_phone !== undefined) {
    updatePayload.contact_phone = normalizePhoneNumber(patchData.contact_phone);
  }

  if (patchData.location_address !== undefined) {
    updatePayload.location_address = patchData.location_address?.trim() || null;
  }

  if (patchData.reminder_minutes !== undefined) {
    updatePayload.reminder_minutes = typeof patchData.reminder_minutes === 'number' && patchData.reminder_minutes >= 0
      ? Math.round(patchData.reminder_minutes)
      : 60;
  }

  if (patchData.job_id !== undefined) {
    updatePayload.job_id = patchData.job_id || null;
  }

  if (patchData.client_id !== undefined) {
    updatePayload.client_id = patchData.client_id || null;
  }

  if (patchData.property_id !== undefined) {
    updatePayload.property_id = patchData.property_id || null;
  }

  if (patchData.user_id !== undefined) {
    updatePayload.user_id = patchData.user_id || null;
  }

  const { data, error } = await supabase
    .from('appointments')
    .update(updatePayload)
    .eq('tenant_id', tenantId)
    .eq('id', appointmentId)
    .select(APPOINTMENT_SELECT_FIELDS)
    .single();

  if (error || !data) {
    console.error('Error updating appointment:', error);
    const err = new Error(error?.message || 'Failed to update appointment');
    err.status = 500;
    err.code = 'DATABASE_ERROR';
    throw err;
  }

  return data;
}

/**
 * Deletes an appointment record scoped strictly to tenant.
 * @param {Object} params
 * @param {string} params.tenantId
 * @param {string} [params.userId]
 * @param {string} params.appointmentId
 * @returns {Promise<{ success: boolean, deletedId: string }>}
 */
export async function deleteAppointment({ tenantId, userId, appointmentId }) {
  assertTenant(tenantId);

  if (!appointmentId) {
    const err = new Error('Appointment ID is required');
    err.status = 400;
    err.code = 'BAD_REQUEST';
    throw err;
  }

  // Ensure record exists before deleting
  await getAppointmentById({ tenantId, appointmentId });

  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('id', appointmentId);

  if (error) {
    console.error('Error deleting appointment:', error);
    const err = new Error(error.message || 'Failed to delete appointment');
    err.status = 500;
    err.code = 'DATABASE_ERROR';
    throw err;
  }

  return {
    success: true,
    deletedId: appointmentId
  };
}
