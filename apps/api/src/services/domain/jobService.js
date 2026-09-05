import { supabase } from '../../config/supabase.js';
import { roundCurrency } from '../pricingEngine.js';
import { resolveEffectiveHourlyRate } from '../masterRates.js';

export const GENERIC_LABOR_PLACEHOLDERS = [
  'work', 'labor', 'general work', 'general labor', 'general labor tasks',
  'tasks', 'hours', 'labor tasks', 'job work', 'labor work', 'misc work',
  'work completed', 'tasks completed', 'work done', 'general'
];

export const GENERIC_MATERIAL_PLACEHOLDERS = [
  'material', 'materials', 'supplies', 'item', 'items', 'stuff', 'misc',
  'miscellaneous', 'general materials', 'parts', 'hardware', 'general'
];

/**
 * Normalizes any common 12-hour (e.g. "8:30 AM") or 24-hour time string into "HH:mm" (24-hour).
 * @param {string} timeStr
 * @returns {string|null}
 */
export function normalizeTimeTo24Hour(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const cleaned = timeStr.trim();
  const ampmMatch = cleaned.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = parseInt(ampmMatch[2], 10);
    const period = ampmMatch[3].toUpperCase();
    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }
  const standardMatch = cleaned.match(/^(\d{1,2}):(\d{2})/);
  if (standardMatch) {
    const hours = parseInt(standardMatch[1], 10);
    const minutes = parseInt(standardMatch[2], 10);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }
  return null;
}

/**
 * Adds a duration in hours to a 24-hour "HH:mm" time string, returning "HH:mm".
 * @param {string} startTimeStr
 * @param {number} hoursNum
 * @returns {string}
 */
export function addHoursToTime(startTimeStr, hoursNum) {
  const norm = normalizeTimeTo24Hour(startTimeStr) || '01:00';
  const [startH, startM] = norm.split(':').map(Number);
  const totalMinutes = Math.round(Number(hoursNum) * 60);
  const combinedMinutes = startM + totalMinutes;
  const endH = (startH + Math.floor(combinedMinutes / 60)) % 24;
  const endM = combinedMinutes % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

function assertTenant(tenantId) {
  if (!tenantId) {
    const err = new Error('Tenant context missing');
    err.status = 400;
    err.code = 'TENANT_REQUIRED';
    throw err;
  }
}

/**
 * Creates a new job with masterRates resolution and tenant isolation.
 * @param {Object} params
 * @param {string} params.tenantId
 * @param {string} [params.userId]
 * @param {Object} params.jobData
 * @returns {Promise<Object>} Created job
 */
export async function createJob({ tenantId, userId, jobData }) {
  assertTenant(tenantId);
  if (!jobData?.title || !jobData.title.trim()) {
    const err = new Error('Job title is required');
    err.status = 400;
    err.code = 'BAD_REQUEST';
    throw err;
  }
  if (!jobData?.client_id) {
    const err = new Error('Client ID is required');
    err.status = 400;
    err.code = 'BAD_REQUEST';
    throw err;
  }

  const rateType = jobData.rate_type || 'hourly';
  const finalHourlyRate = rateType === 'hourly'
    ? (typeof jobData.hourly_rate === 'number' && jobData.hourly_rate > 0 
        ? jobData.hourly_rate 
        : resolveEffectiveHourlyRate({ rateType: 'hourly' }))
    : null;
  const finalFlatRate = rateType === 'flat' ? (Number(jobData.flat_rate) || 0) : null;

  const insertPayload = {
    tenant_id: tenantId,
    client_id: jobData.client_id,
    property_id: jobData.property_id || null,
    title: jobData.title.trim(),
    rate_type: rateType,
    hourly_rate: finalHourlyRate,
    flat_rate: finalFlatRate,
    start_date: jobData.start_date || new Date().toISOString().split('T')[0],
    end_date: jobData.end_date || null,
    status: jobData.status || 'open',
    notes: jobData.notes || null
  };

  const { data, error } = await supabase
    .from('jobs')
    .insert([insertPayload])
    .select('*, clients(name), rental_properties(name, address)')
    .single();

  if (error) throw error;
  return data;
}

/**
 * Updates a job with tenant scoping.
 * @param {Object} params
 * @param {string} params.tenantId
 * @param {string} [params.userId]
 * @param {string} params.jobId
 * @param {Object} params.updateData
 * @returns {Promise<Object>} Updated job
 */
export async function updateJob({ tenantId, userId, jobId, updateData }) {
  assertTenant(tenantId);
  if (!jobId) {
    const err = new Error('Job ID is required');
    err.status = 400;
    throw err;
  }

  const patch = { ...updateData };
  if (patch.title) patch.title = patch.title.trim();
  if (patch.rate_type === 'hourly') {
    patch.hourly_rate = typeof patch.hourly_rate === 'number' && patch.hourly_rate > 0
      ? patch.hourly_rate
      : resolveEffectiveHourlyRate({ rateType: 'hourly' });
    patch.flat_rate = null;
  } else if (patch.rate_type === 'flat') {
    patch.flat_rate = Number(patch.flat_rate) || 0;
    patch.hourly_rate = null;
  }

  const { data, error } = await supabase
    .from('jobs')
    .update(patch)
    .eq('id', jobId)
    .eq('tenant_id', tenantId)
    .select('*, clients(name), rental_properties(name, address)')
    .single();

  if (error) throw error;
  if (!data) {
    const err = new Error('Job not found or update failed');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  return data;
}

/**
 * Updates a job status with validation.
 * @param {Object} params
 * @param {string} params.tenantId
 * @param {string} [params.userId]
 * @param {string} params.jobId
 * @param {string} params.status
 * @returns {Promise<Object>} Updated job
 */
export async function updateJobStatus({ tenantId, userId, jobId, status }) {
  assertTenant(tenantId);
  const ALLOWED_STATUSES = ['open', 'in_progress', 'completed', 'on_hold', 'cancelled'];
  if (!ALLOWED_STATUSES.includes(status)) {
    const err = new Error(`Invalid status: ${status}. Must be one of: ${ALLOWED_STATUSES.join(', ')}`);
    err.status = 400;
    err.code = 'BAD_REQUEST';
    throw err;
  }

  const { data, error } = await supabase
    .from('jobs')
    .update({ status })
    .eq('id', jobId)
    .eq('tenant_id', tenantId)
    .select('*, clients(name), rental_properties(name, address)')
    .single();

  if (error) throw error;
  if (!data) {
    const err = new Error('Job not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  return data;
}

/**
 * Safely deletes a job, enforcing that it has no active or paid invoices.
 * @param {Object} params
 * @param {string} params.tenantId
 * @param {string} [params.userId]
 * @param {string} params.jobId
 * @returns {Promise<{ success: boolean, deletedJobId: string }>}
 */
export async function deleteJob({ tenantId, userId, jobId }) {
  assertTenant(tenantId);
  if (!jobId) {
    const err = new Error('Job ID is required');
    err.status = 400;
    throw err;
  }

  const { data: invoices, error: invError } = await supabase
    .from('invoices')
    .select('status')
    .eq('job_id', jobId)
    .eq('tenant_id', tenantId);

  if (invError) throw invError;
  if (invoices && invoices.some(inv => inv.status === 'paid' || inv.status === 'in_progress')) {
    const err = new Error('Cannot delete a job that has paid or in-progress invoices.');
    err.status = 403;
    err.code = 'JOB_HAS_ACTIVE_INVOICES';
    throw err;
  }

  const { error } = await supabase
    .from('jobs')
    .delete()
    .eq('id', jobId)
    .eq('tenant_id', tenantId);

  if (error) throw error;
  return { success: true, deletedJobId: jobId };
}

/**
 * Validates and logs work hours for a job.
 * Enforces zero-assumption policy against generic placeholder task descriptions,
 * normalizes start/end times, and guarantees unbilled status.
 * @param {Object} params
 * @param {string} params.tenantId
 * @param {string} [params.userId]
 * @param {string} params.jobId
 * @param {Object} params.hoursData
 * @returns {Promise<Object>} Inserted job_hours record
 */
export async function logJobHours({ tenantId, userId, jobId, hoursData }) {
  assertTenant(tenantId);
  if (!jobId) {
    const err = new Error('Job ID is required');
    err.status = 400;
    throw err;
  }

  // Ensure job exists and belongs to tenant
  const { data: job, error: jobErr } = await supabase
    .from('jobs')
    .select('id, title')
    .eq('id', jobId)
    .eq('tenant_id', tenantId)
    .single();

  if (jobErr || !job) {
    const err = new Error('Job not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const trimmedDesc = (hoursData?.description || '').trim();
  if (!trimmedDesc || GENERIC_LABOR_PLACEHOLDERS.includes(trimmedDesc.toLowerCase())) {
    const err = new Error('Missing required task description: A specific description of the work or tasks performed is required.');
    err.status = 400;
    err.code = 'MISSING_TASK_DESCRIPTION';
    throw err;
  }

  const parsedHours = parseFloat(hoursData?.hours);
  if (isNaN(parsedHours) || parsedHours <= 0) {
    const err = new Error('Missing required hours: A valid positive number of hours is required.');
    err.status = 400;
    err.code = 'INVALID_HOURS';
    throw err;
  }

  const finalStartTime = normalizeTimeTo24Hour(hoursData?.start_time) || '01:00';
  const finalEndTime = normalizeTimeTo24Hour(hoursData?.end_time) || addHoursToTime(finalStartTime, parsedHours);

  const payload = {
    job_id: job.id,
    hours: parsedHours,
    date: hoursData?.date || new Date().toISOString().split('T')[0],
    description: trimmedDesc,
    start_time: finalStartTime,
    end_time: finalEndTime,
    billing_status: 'unbilled'
  };

  const { data, error } = await supabase
    .from('job_hours')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Updates a job hours entry, enforcing edit lock on billed items.
 * @param {Object} params
 * @param {string} params.tenantId
 * @param {string} [params.userId]
 * @param {string} params.jobId
 * @param {string} params.hourId
 * @param {Object} params.updateData
 * @returns {Promise<Object>} Updated job_hours record
 */
export async function updateJobHours({ tenantId, userId, jobId, hourId, updateData }) {
  assertTenant(tenantId);
  if (!jobId || !hourId) {
    const err = new Error('Job ID and Hour ID are required');
    err.status = 400;
    throw err;
  }

  // Verify job ownership
  const { data: job, error: jobErr } = await supabase
    .from('jobs')
    .select('id')
    .eq('id', jobId)
    .eq('tenant_id', tenantId)
    .single();

  if (jobErr || !job) {
    const err = new Error('Job not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  // Check existing hours record
  const { data: existing, error: existErr } = await supabase
    .from('job_hours')
    .select('*')
    .eq('id', hourId)
    .eq('job_id', jobId)
    .single();

  if (existErr || !existing) {
    const err = new Error('Job hours entry not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  if (existing.billing_status === 'billed') {
    const err = new Error('Cannot modify items that have already been billed.');
    err.status = 403;
    err.code = 'ITEM_LOCKED';
    throw err;
  }

  const patch = { ...updateData };
  if (patch.description !== undefined) {
    const trimmed = patch.description.trim();
    if (!trimmed || GENERIC_LABOR_PLACEHOLDERS.includes(trimmed.toLowerCase())) {
      const err = new Error('Missing required task description: A specific description of the work or tasks performed is required.');
      err.status = 400;
      err.code = 'MISSING_TASK_DESCRIPTION';
      throw err;
    }
    patch.description = trimmed;
  }

  if (patch.hours !== undefined) {
    const parsed = parseFloat(patch.hours);
    if (isNaN(parsed) || parsed <= 0) {
      const err = new Error('Missing required hours: A valid positive number of hours is required.');
      err.status = 400;
      err.code = 'INVALID_HOURS';
      throw err;
    }
    patch.hours = parsed;
  }

  if (patch.start_time !== undefined) {
    patch.start_time = normalizeTimeTo24Hour(patch.start_time) || '01:00';
  }
  if (patch.end_time !== undefined) {
    patch.end_time = normalizeTimeTo24Hour(patch.end_time) || null;
  }

  const { data, error } = await supabase
    .from('job_hours')
    .update(patch)
    .eq('id', hourId)
    .eq('job_id', jobId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Deletes a job hours entry, preventing deletion if billed.
 * @param {Object} params
 * @param {string} params.tenantId
 * @param {string} [params.userId]
 * @param {string} params.jobId
 * @param {string} params.hourId
 * @returns {Promise<{ success: boolean, deletedId: string }>}
 */
export async function deleteJobHours({ tenantId, userId, jobId, hourId }) {
  assertTenant(tenantId);
  if (!jobId || !hourId) {
    const err = new Error('Job ID and Hour ID are required');
    err.status = 400;
    throw err;
  }

  // Verify job ownership
  const { data: job, error: jobErr } = await supabase
    .from('jobs')
    .select('id')
    .eq('id', jobId)
    .eq('tenant_id', tenantId)
    .single();

  if (jobErr || !job) {
    const err = new Error('Job not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const { data: existing, error: existErr } = await supabase
    .from('job_hours')
    .select('billing_status')
    .eq('id', hourId)
    .eq('job_id', jobId)
    .single();

  if (existErr || !existing) {
    const err = new Error('Job hours entry not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  if (existing.billing_status === 'billed') {
    const err = new Error('Cannot modify items that have already been billed.');
    err.status = 403;
    err.code = 'ITEM_LOCKED';
    throw err;
  }

  const { error } = await supabase
    .from('job_hours')
    .delete()
    .eq('id', hourId)
    .eq('job_id', jobId);

  if (error) throw error;
  return { success: true, deletedId: hourId };
}

/**
 * Validates and logs materials for a job.
 * Enforces zero-assumption policy against generic placeholder material descriptions,
 * validates non-negative cost, and guarantees unbilled status.
 * @param {Object} params
 * @param {string} params.tenantId
 * @param {string} [params.userId]
 * @param {string} params.jobId
 * @param {Object} params.materialData
 * @returns {Promise<Object>} Inserted job_materials record
 */
export async function logJobMaterials({ tenantId, userId, jobId, materialData }) {
  assertTenant(tenantId);
  if (!jobId) {
    const err = new Error('Job ID is required');
    err.status = 400;
    throw err;
  }

  // Ensure job exists and belongs to tenant
  const { data: job, error: jobErr } = await supabase
    .from('jobs')
    .select('id')
    .eq('id', jobId)
    .eq('tenant_id', tenantId)
    .single();

  if (jobErr || !job) {
    const err = new Error('Job not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const trimmedDesc = (materialData?.description || '').trim();
  if (!trimmedDesc || GENERIC_MATERIAL_PLACEHOLDERS.includes(trimmedDesc.toLowerCase())) {
    const err = new Error('Missing required material description: A specific name or description of the materials purchased is required.');
    err.status = 400;
    err.code = 'MISSING_MATERIAL_DESCRIPTION';
    throw err;
  }

  const parsedCost = parseFloat(materialData?.cost);
  if (isNaN(parsedCost) || parsedCost < 0) {
    const err = new Error('Missing valid material cost: A valid purchase cost is required.');
    err.status = 400;
    err.code = 'INVALID_MATERIAL_COST';
    throw err;
  }

  const payload = {
    job_id: job.id,
    description: trimmedDesc,
    cost: roundCurrency(parsedCost),
    store: materialData?.store ? materialData.store.trim() : null,
    purchase_date: materialData?.purchase_date || new Date().toISOString().split('T')[0],
    notes: materialData?.notes || null,
    is_from_stock: Boolean(materialData?.is_from_stock),
    billing_status: 'unbilled'
  };

  const { data, error } = await supabase
    .from('job_materials')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Updates a job materials entry, enforcing edit lock on billed items.
 * @param {Object} params
 * @param {string} params.tenantId
 * @param {string} [params.userId]
 * @param {string} params.jobId
 * @param {string} params.materialId
 * @param {Object} params.updateData
 * @returns {Promise<Object>} Updated job_materials record
 */
export async function updateJobMaterials({ tenantId, userId, jobId, materialId, updateData }) {
  assertTenant(tenantId);
  if (!jobId || !materialId) {
    const err = new Error('Job ID and Material ID are required');
    err.status = 400;
    throw err;
  }

  // Verify job ownership
  const { data: job, error: jobErr } = await supabase
    .from('jobs')
    .select('id')
    .eq('id', jobId)
    .eq('tenant_id', tenantId)
    .single();

  if (jobErr || !job) {
    const err = new Error('Job not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  // Check existing material record
  const { data: existing, error: existErr } = await supabase
    .from('job_materials')
    .select('*')
    .eq('id', materialId)
    .eq('job_id', jobId)
    .single();

  if (existErr || !existing) {
    const err = new Error('Job material entry not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  if (existing.billing_status === 'billed') {
    const err = new Error('Cannot modify items that have already been billed.');
    err.status = 403;
    err.code = 'ITEM_LOCKED';
    throw err;
  }

  const patch = { ...updateData };
  if (patch.description !== undefined) {
    const trimmed = patch.description.trim();
    if (!trimmed || GENERIC_MATERIAL_PLACEHOLDERS.includes(trimmed.toLowerCase())) {
      const err = new Error('Missing required material description: A specific name or description of the materials purchased is required.');
      err.status = 400;
      err.code = 'MISSING_MATERIAL_DESCRIPTION';
      throw err;
    }
    patch.description = trimmed;
  }

  if (patch.cost !== undefined) {
    const parsed = parseFloat(patch.cost);
    if (isNaN(parsed) || parsed < 0) {
      const err = new Error('Missing valid material cost: A valid purchase cost is required.');
      err.status = 400;
      err.code = 'INVALID_MATERIAL_COST';
      throw err;
    }
    patch.cost = roundCurrency(parsed);
  }

  if (patch.store !== undefined) {
    patch.store = patch.store ? patch.store.trim() : null;
  }

  const { data, error } = await supabase
    .from('job_materials')
    .update(patch)
    .eq('id', materialId)
    .eq('job_id', jobId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Deletes a job materials entry, preventing deletion if billed.
 * @param {Object} params
 * @param {string} params.tenantId
 * @param {string} [params.userId]
 * @param {string} params.jobId
 * @param {string} params.materialId
 * @returns {Promise<{ success: boolean, deletedId: string }>}
 */
export async function deleteJobMaterials({ tenantId, userId, jobId, materialId }) {
  assertTenant(tenantId);
  if (!jobId || !materialId) {
    const err = new Error('Job ID and Material ID are required');
    err.status = 400;
    throw err;
  }

  // Verify job ownership
  const { data: job, error: jobErr } = await supabase
    .from('jobs')
    .select('id')
    .eq('id', jobId)
    .eq('tenant_id', tenantId)
    .single();

  if (jobErr || !job) {
    const err = new Error('Job not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const { data: existing, error: existErr } = await supabase
    .from('job_materials')
    .select('billing_status')
    .eq('id', materialId)
    .eq('job_id', jobId)
    .single();

  if (existErr || !existing) {
    const err = new Error('Job material entry not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  if (existing.billing_status === 'billed') {
    const err = new Error('Cannot modify items that have already been billed.');
    err.status = 403;
    err.code = 'ITEM_LOCKED';
    throw err;
  }

  const { error } = await supabase
    .from('job_materials')
    .delete()
    .eq('id', materialId)
    .eq('job_id', jobId);

  if (error) throw error;
  return { success: true, deletedId: materialId };
}
