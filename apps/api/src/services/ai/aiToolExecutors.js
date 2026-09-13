import { supabase } from '../../config/supabase.js';
import { resolveEffectiveHourlyRate } from '../masterRates.js';
import { invoiceService, jobService, clientService, appointmentService } from '../domain/index.js';
import { pendingActionManager } from './pendingActionManager.js';
import { entityResolver } from './entityResolver.js';

// --- Safe Resolution Helpers ---
async function resolveClientOrError(identifier, tenantId) {
  const res = await entityResolver.resolveClient(identifier, tenantId);
  if (res.status === 'not_found') return { error: `Client "${identifier}" not found.` };
  if (res.status === 'ambiguous') {
    const list = res.candidates.map(c => `"${c.name}"`).join(', ');
    return { error: `Multiple clients match "${identifier}": ${list}. Please specify.` };
  }
  return { client: res.entity };
}

async function resolveJobOrError(identifier, tenantId, options = {}) {
  const res = await entityResolver.resolveJob(identifier, tenantId, options);
  if (res.status === 'not_found') return { error: `Job "${identifier}" not found.` };
  if (res.status === 'ambiguous') {
    const list = res.candidates.map(j => `"${j.title}"`).join(', ');
    return { error: `Multiple jobs match "${identifier}": ${list}. Please specify.` };
  }
  return { job: res.entity };
}

async function resolveInvoiceOrError(identifier, tenantId) {
  const res = await entityResolver.resolveInvoice(identifier, tenantId);
  if (res.status === 'not_found') return { error: `Invoice "${identifier}" not found.` };
  if (res.status === 'ambiguous') {
    const list = res.candidates.map(i => `#${i.invoice_number} ("${i.labor_title || 'Invoice'}")`).join(', ');
    return { error: `Multiple invoices match "${identifier}": ${list}. Please specify.` };
  }
  return { invoice: res.entity };
}

async function resolveAppointmentOrError(identifier, tenantId, options = {}) {
  const res = await entityResolver.resolveAppointment(identifier, tenantId, options);
  if (res.status === 'not_found') return { error: `Appointment "${identifier}" not found.` };
  if (res.status === 'ambiguous') {
    const list = res.candidates.map(a => `"${a.title}" (${new Date(a.start_time).toLocaleDateString()})`).join(', ');
    return { error: `Multiple appointments match "${identifier}": ${list}. Please specify which one.` };
  }
  return { appointment: res.entity };
}

function normalizeTimeTo24Hour(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const cleaned = timeStr.trim();
  // Check 12-hour format with AM/PM (e.g. "8:30 AM", "02:15 PM")
  const ampmMatch = cleaned.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = parseInt(ampmMatch[2], 10);
    const period = ampmMatch[3].toUpperCase();
    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }
  // Check 24-hour format (e.g. "08:30", "14:00", "01:00:00")
  const standardMatch = cleaned.match(/^(\d{1,2}):(\d{2})/);
  if (standardMatch) {
    const hours = parseInt(standardMatch[1], 10);
    const minutes = parseInt(standardMatch[2], 10);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }
  return null;
}

function addHoursToTime(startTimeStr, hoursNum) {
  const norm = normalizeTimeTo24Hour(startTimeStr) || '01:00';
  const [startH, startM] = norm.split(':').map(Number);
  const totalMinutes = Math.round(Number(hoursNum) * 60);
  const combinedMinutes = startM + totalMinutes;
  const endH = (startH + Math.floor(combinedMinutes / 60)) % 24;
  const endM = combinedMinutes % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

/**
 * Converts a contractor's local appointment timestamp string into a standardized UTC ISO string.
 * Handles formats:
 * - "YYYY-MM-DD HH:mm" / "YYYY-MM-DD HH:mm:ss"
 * - "YYYY-MM-DDTHH:mm" / "YYYY-MM-DDTHH:mm:ss"
 * - Strings where the LLM appended "Z" to a local time (e.g. "2026-09-13T14:00:00Z")
 * - Strings with explicit non-Z timezone offsets (e.g. "-05:00", "+01:00")
 * - Date-only strings ("YYYY-MM-DD")
 *
 * @param {string} timeInput - The timestamp or date string from the AI tool call
 * @param {string} [timezone='UTC'] - IANA timezone identifier (e.g. 'America/Chicago')
 * @param {boolean} [isEndOfDay=false] - For date-only strings, whether to set to 23:59:59.999
 * @returns {string|null} - UTC ISO timestamp (e.g. "2026-09-13T19:00:00.000Z")
 */
export function parseAppointmentTimeToUtc(timeInput, timezone = 'UTC', isEndOfDay = false) {
  if (!timeInput) return null;
  const str = String(timeInput).trim();
  if (!str) return null;

  // Check if string has an explicit numeric timezone offset (e.g. "-05:00", "+02:00", "-0500")
  const hasNumericOffset = /[+-]\d{2}:?\d{2}$/.test(str);
  if (hasNumericOffset) {
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }

  // Strip naive trailing 'Z' / 'z' if the LLM blindly appended it to local time
  const clean = str.replace(/[zZ]$/, '').replace('T', ' ');
  const [datePart, timePart] = clean.split(' ');
  const dateSegments = (datePart || '').split('-');
  if (dateSegments.length < 3) return null;

  const y = Number(dateSegments[0]);
  const m = Number(dateSegments[1]);
  const d = Number(dateSegments[2]);
  if (!y || !m || !d || isNaN(y) || isNaN(m) || isNaN(d)) return null;

  let hr = 0;
  let min = 0;
  let sec = 0;
  let ms = 0;

  if (timePart) {
    const timeSegments = timePart.split(':');
    hr = Number(timeSegments[0] || 0);
    min = Number(timeSegments[1] || 0);
    const secAndMs = (timeSegments[2] || '0').split('.');
    sec = Number(secAndMs[0] || 0);
    ms = Number(secAndMs[1] ? secAndMs[1].padEnd(3, '0').slice(0, 3) : 0);
  } else if (isEndOfDay) {
    hr = 23;
    min = 59;
    sec = 59;
    ms = 999;
  }

  const naiveUtc = new Date(Date.UTC(y, m - 1, d, hr, min, sec, ms));
  if (isNaN(naiveUtc.getTime())) return null;

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false
    });

    const parts = Object.fromEntries(formatter.formatToParts(naiveUtc).map(p => [p.type, p.value]));
    let fHour = Number(parts.hour);
    if (fHour === 24) fHour = 0;
    const fUtc = new Date(Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      fHour,
      Number(parts.minute),
      Number(parts.second),
      ms
    ));

    const offsetMs = fUtc.getTime() - naiveUtc.getTime();
    const actualUtc = new Date(naiveUtc.getTime() - offsetMs);
    return actualUtc.toISOString();
  } catch {
    return naiveUtc.toISOString();
  }
}

/**
 * Formats an appointment record for AI consumption with localized times and schedule strings.
 * @param {Object} apt - Appointment database record
 * @param {string} [timezone='UTC'] - Contractor's IANA timezone
 * @returns {Object|null}
 */
export function formatAppointmentForAi(apt, timezone = 'UTC') {
  if (!apt) return null;
  const isAllDay = !!apt.all_day;
  let formattedTimes = '';
  let localStartTime = apt.start_time;
  let localEndTime = apt.end_time;

  if (isAllDay) {
    const dStr = String(apt.start_time).split('T')[0];
    formattedTimes = `All Day (${dStr})`;
    localStartTime = dStr;
    localEndTime = apt.end_time ? String(apt.end_time).split('T')[0] : dStr;
  } else if (apt.start_time) {
    try {
      const startDate = new Date(apt.start_time);
      const endDate = apt.end_time ? new Date(apt.end_time) : new Date(startDate.getTime() + 3600000);

      const dateFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      const timeFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      const startLocalIso = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(startDate).replace(', ', ' ');

      const endLocalIso = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(endDate).replace(', ', ' ');

      localStartTime = startLocalIso;
      localEndTime = endLocalIso;

      const dateStr = dateFormatter.format(startDate);
      const startTimeStr = timeFormatter.format(startDate);
      const endTimeStr = timeFormatter.format(endDate);

      formattedTimes = `${dateStr}, ${startTimeStr} – ${endTimeStr}`;
    } catch {
      formattedTimes = `${apt.start_time} – ${apt.end_time || ''}`;
    }
  }

  return {
    ...apt,
    local_start_time: localStartTime,
    local_end_time: localEndTime,
    local_formatted_schedule: formattedTimes,
    user_timezone: timezone
  };
}

/**
 * Executes an AI tool call securely within tenant boundaries.
 * @param {string} toolName
 * @param {Object} args
 * @param {Object} context
 * @param {string} context.tenantId - Verified from request session
 * @param {string} context.userId - Verified from request session
 * @param {string} [context.timezone='UTC'] - Verified user IANA timezone
 * @returns {Promise<{ result?: any, error?: string, mutation?: string|null, entityId?: string }>}
 */
export async function executeAiTool(toolName, args = {}, { tenantId, userId, timezone = 'UTC' }) {
  if (!tenantId) {
    return { error: 'Tenant context is missing from authenticated session.' };
  }

  try {
    switch (toolName) {
      case 'get_dashboard_summary': {
        const [clientsRes, jobsRes, invoicesRes] = await Promise.all([
          supabase.from('clients').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'active'),
          supabase.from('jobs').select('id, title, status, rate_type, hourly_rate, flat_rate, start_date').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(5),
          supabase.from('invoices').select('id, invoice_number, total_amount, status, due_date').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(5)
        ]);

        return {
          result: {
            activeClientsCount: clientsRes.count || 0,
            recentJobs: jobsRes.data || [],
            recentInvoices: invoicesRes.data || []
          },
          mutation: null
        };
      }

      case 'search_clients': {
        const { query } = args;
        let dbQuery = supabase
          .from('clients')
          .select('id, name, email, phone, address, client_type, status, created_at')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(20);

        if (query && query.trim()) {
          const cleanQuery = query.trim();
          dbQuery = dbQuery.or(`name.ilike.%${cleanQuery}%,address.ilike.%${cleanQuery}%,email.ilike.%${cleanQuery}%`);
        }

        const { data, error } = await dbQuery;
        if (error) return { error: error.message };
        return { result: data || [], mutation: null };
      }

      case 'get_client_details': {
        const { client_id } = args;
        const resolution = await resolveClientOrError(client_id, tenantId);
        if (resolution.error) return { error: resolution.error };
        const client = resolution.client;

        const [propertiesRes, jobsRes] = await Promise.all([
          supabase.from('rental_properties').select('*').eq('client_id', client.id).eq('tenant_id', tenantId),
          supabase.from('jobs').select('id, title, status, start_date, rate_type').eq('client_id', client.id).eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(10)
        ]);

        return {
          result: {
            client,
            properties: propertiesRes.data || [],
            recentJobs: jobsRes.data || []
          },
          mutation: null
        };
      }

      case 'create_client': {
        const { name, email, phone, address, client_type, notes } = args;
        try {
          const data = await clientService.createClient({
            tenantId,
            userId,
            clientData: { name, email, phone, address, client_type, notes }
          });
          return { result: data, mutation: 'clients', entityId: data.id };
        } catch (err) {
          return { error: err.message };
        }
      }

      case 'update_client': {
        const { client_id, ...updates } = args;
        const resolution = await resolveClientOrError(client_id, tenantId);
        if (resolution.error) return { error: resolution.error };
        const client = resolution.client;

        try {
          const data = await clientService.updateClient({
            tenantId,
            userId,
            clientId: client.id,
            updateData: updates
          });
          return { result: data, mutation: 'clients', entityId: client.id };
        } catch (err) {
          return { error: err.message };
        }
      }

      case 'list_jobs': {
        const { status, client_id, limit = 20 } = args;
        let resolvedClientId = null;
        if (client_id) {
          const clientRes = await entityResolver.resolveClient(client_id, tenantId);
          if (clientRes.status === 'resolved') resolvedClientId = clientRes.entity.id;
        }

        let dbQuery = supabase
          .from('jobs')
          .select('id, title, status, rate_type, hourly_rate, flat_rate, start_date, client_id, clients(name)')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(Math.min(limit, 50));

        if (status) dbQuery = dbQuery.eq('status', status);
        if (resolvedClientId) dbQuery = dbQuery.eq('client_id', resolvedClientId);

        const { data, error } = await dbQuery;
        if (error) return { error: error.message };
        return { result: data || [], mutation: null };
      }

      case 'get_job_details': {
        const { job_id } = args;
        const resolution = await resolveJobOrError(job_id, tenantId);
        if (resolution.error) return { error: resolution.error };
        const job = resolution.job;

        const [hoursRes, materialsRes, invoicesRes] = await Promise.all([
          supabase.from('job_hours').select('*').eq('job_id', job.id).order('date', { ascending: false }),
          supabase.from('job_materials').select('*').eq('job_id', job.id).order('created_at', { ascending: false }),
          supabase.from('invoices').select('id, invoice_number, status, total_amount, due_date, created_at').eq('job_id', job.id).eq('tenant_id', tenantId).order('created_at', { ascending: false })
        ]);

        const allHours = hoursRes.data || [];
        const allMaterials = materialsRes.data || [];
        const unbilledHours = allHours.filter(h => h.billing_status === 'unbilled');
        const unbilledMaterials = allMaterials.filter(m => m.billing_status === 'unbilled');

        const totalHours = allHours.reduce((sum, h) => sum + Number(h.hours || 0), 0);
        const totalMaterialsCost = allMaterials.reduce((sum, m) => sum + Number(m.cost || 0), 0);

        return {
          result: {
            job,
            hours: allHours,
            materials: allMaterials,
            invoices: invoicesRes.data || [],
            unbilled: {
              hours: unbilledHours,
              materials: unbilledMaterials
            },
            totals: {
              totalHours,
              totalMaterialsCost,
              unbilledHoursCount: unbilledHours.length,
              unbilledMaterialsCount: unbilledMaterials.length,
              invoicesCount: (invoicesRes.data || []).length
            }
          },
          mutation: null
        };
      }

      case 'create_job': {
        const { client_id, title, rate_type, hourly_rate, flat_rate, start_date, status, notes } = args;
        const clientResolution = await resolveClientOrError(client_id, tenantId);
        if (clientResolution.error) return { error: clientResolution.error };
        const client = clientResolution.client;

        try {
          const data = await jobService.createJob({
            tenantId,
            userId,
            jobData: {
              client_id: client.id,
              title,
              rate_type,
              hourly_rate,
              flat_rate,
              start_date,
              status,
              notes
            }
          });
          return { result: data, mutation: 'jobs', entityId: data.id };
        } catch (err) {
          return { error: err.message };
        }
      }

      case 'update_job_status': {
        const { job_id, status } = args;
        const resolution = await resolveJobOrError(job_id, tenantId);
        if (resolution.error) return { error: resolution.error };
        const job = resolution.job;

        try {
          const data = await jobService.updateJobStatus({
            tenantId,
            userId,
            jobId: job.id,
            status
          });
          return { result: data, mutation: 'jobs', entityId: job.id };
        } catch (err) {
          return { error: err.message };
        }
      }

      case 'log_job_hours': {
        const { job_id, hours, date, description, start_time, end_time } = args;
        const resolution = await resolveJobOrError(job_id, tenantId);
        if (resolution.error) return { error: resolution.error };
        const job = resolution.job;

        try {
          const data = await jobService.logJobHours({
            tenantId,
            userId,
            jobId: job.id,
            hoursData: {
              hours,
              date,
              description,
              start_time,
              end_time
            }
          });
          return { result: data, mutation: 'hours', entityId: job.id };
        } catch (err) {
          return { error: err.message };
        }
      }

      case 'update_job_hours': {
        const { job_id, hour_id, hours, description, date, start_time, end_time } = args;
        const resolution = await resolveJobOrError(job_id, tenantId);
        if (resolution.error) return { error: resolution.error };
        const job = resolution.job;

        const hourRes = await entityResolver.resolveJobHour(hour_id, job.id, tenantId);
        if (hourRes.status === 'not_found') {
          return { error: `No matching hours record found for ${hour_id ? `"${hour_id}" on ` : ''}Job "${job.title}".` };
        }
        if (hourRes.status === 'ambiguous') {
          const list = hourRes.candidates.map(h => `${h.date}: ${h.hours}hrs ("${h.description || 'work'}")`).join(', ');
          return { error: `Multiple hours entries match "${hour_id}": ${list}. Please specify which one to update.` };
        }
        const targetHour = hourRes.entity;

        if (targetHour.billing_status === 'on_draft') {
          let invNumber = targetHour.invoice_id;
          if (targetHour.invoice_id) {
            const { data: inv } = await supabase.from('invoices').select('invoice_number').eq('id', targetHour.invoice_id).single();
            if (inv?.invoice_number) invNumber = `#${inv.invoice_number}`;
          }
          return { error: `Cannot modify hours for "${targetHour.description || targetHour.date}" because it is currently linked to Draft Invoice ${invNumber || ''}. Please remove it from the draft invoice first, or delete the draft invoice.` };
        }

        if (targetHour.billing_status === 'billed') {
          return { error: `Cannot modify hours for "${targetHour.description || targetHour.date}" because it has already been finalized on a billed invoice.` };
        }

        try {
          const updateData = {};
          if (hours !== undefined) updateData.hours = hours;
          if (description !== undefined) updateData.description = description;
          if (date !== undefined) updateData.date = date;
          if (start_time !== undefined) updateData.start_time = start_time;
          if (end_time !== undefined) updateData.end_time = end_time;

          const data = await jobService.updateJobHours({
            tenantId,
            userId,
            jobId: job.id,
            hourId: targetHour.id,
            updateData
          });
          return { result: data, mutation: 'hours', entityId: job.id };
        } catch (err) {
          return { error: err.message };
        }
      }

      case 'delete_job_hours': {
        const { job_id, hour_id } = args;
        const resolution = await resolveJobOrError(job_id, tenantId);
        if (resolution.error) return { error: resolution.error };
        const job = resolution.job;

        const hourRes = await entityResolver.resolveJobHour(hour_id, job.id, tenantId);
        if (hourRes.status === 'not_found') {
          return { error: `No matching hours record found for "${hour_id}" on Job "${job.title}".` };
        }
        if (hourRes.status === 'ambiguous') {
          const list = hourRes.candidates.map(h => `${h.date}: ${h.hours}hrs ("${h.description || 'work'}")`).join(', ');
          return { error: `Multiple hours entries match "${hour_id}": ${list}. Please specify which one to delete.` };
        }
        const targetHour = hourRes.entity;

        if (targetHour.billing_status === 'on_draft') {
          let invNumber = targetHour.invoice_id;
          if (targetHour.invoice_id) {
            const { data: inv } = await supabase.from('invoices').select('invoice_number').eq('id', targetHour.invoice_id).single();
            if (inv?.invoice_number) invNumber = `#${inv.invoice_number}`;
          }
          return { error: `Cannot delete hours entry "${targetHour.description || targetHour.date}" because it is currently linked to Draft Invoice ${invNumber || ''}. Please remove it from the draft invoice first, or delete the draft invoice.` };
        }

        if (targetHour.billing_status === 'billed') {
          return { error: `Cannot delete hours entry "${targetHour.description || targetHour.date}" because it has already been finalized on a billed invoice.` };
        }

        try {
          await jobService.deleteJobHours({
            tenantId,
            userId,
            jobId: job.id,
            hourId: targetHour.id
          });
          return {
            result: { success: true, deletedHour: targetHour, message: `Successfully deleted ${targetHour.hours} hrs ("${targetHour.description || 'work'}") from Job "${job.title}".` },
            mutation: 'hours',
            entityId: job.id
          };
        } catch (err) {
          return { error: err.message };
        }
      }

      case 'log_job_materials': {
        const { job_id, description, cost, store, purchase_date, notes, is_from_stock } = args;
        const resolution = await resolveJobOrError(job_id, tenantId);
        if (resolution.error) return { error: resolution.error };
        const job = resolution.job;

        try {
          const data = await jobService.logJobMaterials({
            tenantId,
            userId,
            jobId: job.id,
            materialData: {
              description,
              cost,
              store,
              purchase_date,
              notes,
              is_from_stock
            }
          });
          return { result: data, mutation: 'materials', entityId: job.id };
        } catch (err) {
          return { error: err.message };
        }
      }

      case 'log_job_materials_batch': {
        const { job_id, store, purchase_date, items } = args;
        const resolution = await resolveJobOrError(job_id, tenantId);
        if (resolution.error) return { error: resolution.error };
        const job = resolution.job;

        try {
          const data = await jobService.logJobMaterialsBatch({
            tenantId,
            userId,
            jobId: job.id,
            store,
            purchaseDate: purchase_date,
            items: (items || []).map(it => ({
              description: it.description,
              cost: it.cost,
              notes: it.notes
            }))
          });
          return { result: data, mutation: 'materials', entityId: job.id };
        } catch (err) {
          return { error: err.message };
        }
      }

      case 'update_job_material': {
        const { job_id, material_id, description, cost, store, purchase_date, notes, is_from_stock } = args;
        const resolution = await resolveJobOrError(job_id, tenantId);
        if (resolution.error) return { error: resolution.error };
        const job = resolution.job;

        const matRes = await entityResolver.resolveJobMaterial(material_id, job.id, tenantId);
        if (matRes.status === 'not_found') {
          return { error: `No matching material found for "${material_id}" on Job "${job.title}".` };
        }
        if (matRes.status === 'ambiguous') {
          const list = matRes.candidates.map(m => `"${m.description}" ($${m.cost})`).join(', ');
          return { error: `Multiple materials match "${material_id}": ${list}. Please specify which one to update.` };
        }
        const targetMaterial = matRes.entity;

        if (targetMaterial.billing_status === 'on_draft') {
          let invNumber = targetMaterial.invoice_id;
          if (targetMaterial.invoice_id) {
            const { data: inv } = await supabase.from('invoices').select('invoice_number').eq('id', targetMaterial.invoice_id).single();
            if (inv?.invoice_number) invNumber = `#${inv.invoice_number}`;
          }
          return { error: `Cannot modify material "${targetMaterial.description}" because it is currently linked to Draft Invoice ${invNumber || ''}. Please remove it from the draft invoice first, or delete the draft invoice.` };
        }

        if (targetMaterial.billing_status === 'billed') {
          return { error: `Cannot modify material "${targetMaterial.description}" because it has already been finalized on a billed invoice.` };
        }

        try {
          const updateData = {};
          if (description !== undefined) updateData.description = description;
          if (cost !== undefined) updateData.cost = cost;
          if (store !== undefined) updateData.store = store;
          if (purchase_date !== undefined) updateData.purchase_date = purchase_date;
          if (notes !== undefined) updateData.notes = notes;
          if (is_from_stock !== undefined) updateData.is_from_stock = is_from_stock;

          const data = await jobService.updateJobMaterials({
            tenantId,
            userId,
            jobId: job.id,
            materialId: targetMaterial.id,
            updateData
          });
          return { result: data, mutation: 'materials', entityId: job.id };
        } catch (err) {
          return { error: err.message };
        }
      }

      case 'delete_job_material': {
        const { job_id, material_id } = args;
        const resolution = await resolveJobOrError(job_id, tenantId);
        if (resolution.error) return { error: resolution.error };
        const job = resolution.job;

        const matRes = await entityResolver.resolveJobMaterial(material_id, job.id, tenantId);
        if (matRes.status === 'not_found') {
          return { error: `No matching material found for "${material_id}" on Job "${job.title}".` };
        }
        if (matRes.status === 'ambiguous') {
          const list = matRes.candidates.map(m => `"${m.description}" ($${m.cost})`).join(', ');
          return { error: `Multiple materials match "${material_id}": ${list}. Please specify which one to delete.` };
        }
        const targetMaterial = matRes.entity;

        if (targetMaterial.billing_status === 'on_draft') {
          let invNumber = targetMaterial.invoice_id;
          if (targetMaterial.invoice_id) {
            const { data: inv } = await supabase.from('invoices').select('invoice_number').eq('id', targetMaterial.invoice_id).single();
            if (inv?.invoice_number) invNumber = `#${inv.invoice_number}`;
          }
          return { error: `Cannot delete material "${targetMaterial.description}" because it is currently linked to Draft Invoice ${invNumber || ''}. Please remove it from the draft invoice first, or delete the draft invoice.` };
        }

        if (targetMaterial.billing_status === 'billed') {
          return { error: `Cannot delete material "${targetMaterial.description}" because it has already been finalized on a billed invoice.` };
        }

        try {
          await jobService.deleteJobMaterials({
            tenantId,
            userId,
            jobId: job.id,
            materialId: targetMaterial.id
          });
          return {
            result: { success: true, deletedMaterial: targetMaterial, message: `Successfully deleted "${targetMaterial.description}" ($${targetMaterial.cost}) from Job "${job.title}".` },
            mutation: 'materials',
            entityId: job.id
          };
        } catch (err) {
          return { error: err.message };
        }
      }

      // --- Invoicing & Billing Tools (Phase 3 + Itemized Labor) ---
      case 'draft_invoice': {
        const { client_id, job_id, labor_title, due_date, tax_rate_percent, markup_amount, notes } = args;

        let targetJobId = null;
        let targetClientId = null;

        if (job_id) {
          const jobRes = await resolveJobOrError(job_id, tenantId);
          if (jobRes.error) return { error: jobRes.error };
          targetJobId = jobRes.job.id;
          targetClientId = jobRes.job.client_id;
        }

        if (client_id) {
          const clientRes = await resolveClientOrError(client_id, tenantId);
          if (clientRes.error) return { error: clientRes.error };
          targetClientId = clientRes.client.id;
        }

        if (!targetClientId && !targetJobId) {
          return { error: 'A valid client or job is required to draft an invoice.' };
        }

        try {
          const draftRes = await invoiceService.draftInvoiceFromJob({
            tenantId,
            userId,
            clientId: targetClientId,
            jobId: targetJobId,
            laborTitle: labor_title,
            dueDate: due_date,
            taxRatePercent: tax_rate_percent,
            markupAmount: markup_amount,
            notes
          });

          return {
            result: {
              invoiceId: draftRes.invoice.id,
              invoiceNumber: draftRes.invoice.invoice_number,
              clientName: draftRes.client.name,
              totalAmount: draftRes.financials.totalAmount,
              subtotal: draftRes.financials.subtotal,
              taxAmount: draftRes.financials.taxAmount,
              status: 'draft',
              dueDate: draftRes.invoice.due_date
            },
            mutation: 'invoices',
            entityId: draftRes.invoice.id
          };
        } catch (err) {
          console.error('[AI Tool Executor] draft_invoice error:', err);
          return { error: err.message };
        }
      }

      case 'add_unbilled_items_to_invoice': {
        const { invoice_id, job_id } = args;
        const resolution = await resolveInvoiceOrError(invoice_id, tenantId);
        if (resolution.error) return { error: resolution.error };
        const inv = resolution.invoice;

        let resolvedJobId = null;
        if (job_id) {
          const jobRes = await resolveJobOrError(job_id, tenantId);
          if (jobRes.error) return { error: jobRes.error };
          resolvedJobId = jobRes.job.id;
        }

        try {
          const addRes = await invoiceService.addUnbilledJobItemsToInvoice({
            tenantId,
            userId,
            invoiceId: inv.id,
            jobId: resolvedJobId || inv.job_id
          });

          return {
            result: {
              invoiceId: addRes.invoice.id,
              invoiceNumber: addRes.invoice.invoice_number,
              status: addRes.invoice.status,
              addedHoursCount: addRes.addedHoursCount,
              addedMaterialsCount: addRes.addedMaterialsCount,
              newLaborAmount: addRes.financials.laborAmount,
              newMaterialsAmount: addRes.financials.materialsAmount,
              newTotalAmount: addRes.financials.totalAmount,
              addedItems: addRes.addedItems
            },
            mutation: 'invoices',
            entityId: addRes.invoice.id
          };
        } catch (err) {
          console.error('[AI Tool Executor] add_unbilled_items_to_invoice error:', err);
          return { error: err.message };
        }
      }

      case 'add_invoice_line_item': {
        const { invoice_id, description, amount, source_type } = args;
        const resolution = await resolveInvoiceOrError(invoice_id, tenantId);
        if (resolution.error) return { error: resolution.error };
        const inv = resolution.invoice;

        try {
          const { item, invoice: updatedInv } = await invoiceService.addInvoiceLineItem({
            tenantId,
            userId,
            invoiceId: inv.id,
            itemData: {
              description,
              amount,
              source_type
            }
          });

          return {
            result: {
              lineItemId: item.id,
              invoiceId: updatedInv.id,
              description: item.description,
              amount: item.amount,
              newTotal: updatedInv.total_amount
            },
            mutation: 'invoices',
            entityId: updatedInv.id
          };
        } catch (err) {
          console.error('[AI Tool Executor] add_invoice_line_item error:', err);
          return { error: err.message };
        }
      }

      case 'update_invoice_status': {
        const { invoice_id, status, reason } = args;
        const resolution = await resolveInvoiceOrError(invoice_id, tenantId);
        if (resolution.error) return { error: resolution.error };
        const inv = resolution.invoice;

        try {
          const updatedInvoice = await invoiceService.updateInvoiceStatus({
            tenantId,
            userId,
            invoiceId: inv.id,
            status,
            reason: reason || 'Updated via AI Copilot'
          });

          return { result: updatedInvoice, mutation: 'invoices', entityId: inv.id };
        } catch (err) {
          console.error('[AI Tool Executor] update_invoice_status error:', err);
          return { error: err.message };
        }
      }

      case 'get_invoice_details': {
        const { invoice_id } = args;
        const resolution = await resolveInvoiceOrError(invoice_id, tenantId);
        if (resolution.error) return { error: resolution.error };
        const inv = resolution.invoice;

        const { data, error } = await supabase
          .from('invoices')
          .select(`
            *,
            clients (id, name, email, phone),
            jobs (id, title),
            invoice_line_items (*)
          `)
          .eq('id', inv.id)
          .eq('tenant_id', tenantId)
          .single();

        if (error) return { error: error.message };
        return { result: data };
      }

      case 'search_invoices': {
        const { query, status } = args;
        const res = await entityResolver.resolveInvoice(query, tenantId);
        if (res.status === 'resolved') {
          return { result: [res.entity] };
        }
        if (res.status === 'ambiguous') {
          return { result: res.candidates };
        }

        let dbQuery = supabase
          .from('invoices')
          .select('id, invoice_number, total_amount, status, due_date, labor_title, clients(name), jobs(title)')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(10);

        if (status) dbQuery = dbQuery.eq('status', status);
        const { data, error } = await dbQuery;
        if (error) return { error: error.message };
        return { result: data || [] };
      }

      // --- Destructive Action Safety Interceptors (Human-in-the-Loop) ---
      case 'request_delete_job': {
        const { job_id, reason } = args;
        const resolution = await resolveJobOrError(job_id, tenantId);
        if (resolution.error) return { error: resolution.error };
        const job = resolution.job;

        // Count cascade impact
        const [hoursCount, matsCount] = await Promise.all([
          supabase.from('job_hours').select('id', { count: 'exact', head: true }).eq('job_id', job.id),
          supabase.from('job_materials').select('id', { count: 'exact', head: true }).eq('job_id', job.id)
        ]);

        const impactSummary = `Job "${job.title}" for ${job.clients?.name || 'client'} has ${hoursCount.count || 0} logged time entries and ${matsCount.count || 0} materials records.`;

        const pendingAction = pendingActionManager.createAction({
          tenantId,
          userId,
          actionType: 'delete_job',
          targetId: job.id,
          description: `Permanently delete Job "${job.title}"`,
          impactSummary
        });

        return {
          result: {
            confirmation_required: true,
            actionId: pendingAction.actionId,
            actionType: 'delete_job',
            targetId: job.id,
            title: `Delete Job "${job.title}"`,
            impactSummary,
            reason: reason || 'Contractor requested deletion'
          },
          mutation: null
        };
      }

      case 'request_delete_client': {
        const { client_id, reason } = args;
        const resolution = await resolveClientOrError(client_id, tenantId);
        if (resolution.error) return { error: resolution.error };
        const client = resolution.client;

        const { count: jobCount } = await supabase
          .from('jobs')
          .select('id', { count: 'exact', head: true })
          .eq('client_id', client.id);

        const impactSummary = `Client "${client.name}" has ${jobCount || 0} associated jobs.`;

        const pendingAction = pendingActionManager.createAction({
          tenantId,
          userId,
          actionType: 'delete_client',
          targetId: client.id,
          description: `Permanently delete Client "${client.name}"`,
          impactSummary
        });

        return {
          result: {
            confirmation_required: true,
            actionId: pendingAction.actionId,
            actionType: 'delete_client',
            targetId: client.id,
            title: `Delete Client "${client.name}"`,
            impactSummary,
            reason: reason || 'Contractor requested deletion'
          },
          mutation: null
        };
      }

      case 'request_delete_invoice': {
        const { invoice_id, reason } = args;
        const resolution = await resolveInvoiceOrError(invoice_id, tenantId);
        if (resolution.error) return { error: resolution.error };
        const inv = resolution.invoice;

        if (inv.status === 'paid') {
          return { error: `Invoice #${inv.invoice_number} is already paid and cannot be deleted. Paid invoices can only be voided for accounting compliance.` };
        }
        if (['sent', 'overdue'].includes(inv.status)) {
          return { error: `Invoice #${inv.invoice_number} has already been sent to the client. Sent invoices must either be voided with request_void_invoice or reverted to draft before deleting.` };
        }
        if (inv.status === 'voided') {
          return { error: `Invoice #${inv.invoice_number} is already voided.` };
        }

        const { data: lines } = await supabase
          .from('invoice_line_items')
          .select('source_type, source_id')
          .eq('invoice_id', inv.id);

        const items = lines || [];
        const laborCount = items.filter(i => i.source_type === 'labor' && i.source_id).length;
        const matCount = items.filter(i => i.source_type === 'material' && i.source_id).length;

        let impactDetails = [];
        if (laborCount > 0) impactDetails.push(`${laborCount} labor entries`);
        if (matCount > 0) impactDetails.push(`${matCount} material records`);
        const itemNote = impactDetails.length > 0 ? ` (${impactDetails.join(' and ')} will revert to unbilled)` : '';

        const impactSummary = `Invoice #${inv.invoice_number} for $${Number(inv.total_amount || 0).toFixed(2)} (${inv.clients?.name || 'client'}) will be permanently deleted${itemNote}.`;

        const pendingAction = pendingActionManager.createAction({
          tenantId,
          userId,
          actionType: 'delete_invoice',
          targetId: inv.id,
          description: `Permanently delete Invoice #${inv.invoice_number}`,
          impactSummary
        });

        return {
          result: {
            confirmation_required: true,
            actionId: pendingAction.actionId,
            actionType: 'delete_invoice',
            targetId: inv.id,
            title: `Delete Invoice #${inv.invoice_number}`,
            impactSummary,
            reason: reason || 'Contractor requested deletion'
          },
          mutation: null
        };
      }

      case 'request_void_invoice': {
        const { invoice_id, reason } = args;
        const resolution = await resolveInvoiceOrError(invoice_id, tenantId);
        if (resolution.error) return { error: resolution.error };
        const inv = resolution.invoice;

        if (['draft', 'ready_to_send', 'disputed'].includes(inv.status)) {
          return { error: `Invoice #${inv.invoice_number} is in "${inv.status}" status. Invoices in draft or disputed status should be deleted using request_delete_invoice, not voided.` };
        }
        if (inv.status === 'voided') {
          return { error: `Invoice #${inv.invoice_number} is already voided.` };
        }

        const { data: lines } = await supabase
          .from('invoice_line_items')
          .select('source_type, source_id')
          .eq('invoice_id', inv.id);

        const items = lines || [];
        const laborCount = items.filter(i => i.source_type === 'labor' && i.source_id).length;
        const matCount = items.filter(i => i.source_type === 'material' && i.source_id).length;

        let impactDetails = [];
        if (laborCount > 0) impactDetails.push(`${laborCount} labor entries`);
        if (matCount > 0) impactDetails.push(`${matCount} material records`);
        const itemNote = impactDetails.length > 0 ? ` (${impactDetails.join(' and ')} will revert to unbilled)` : '';

        const impactSummary = `Invoice #${inv.invoice_number} for $${Number(inv.total_amount || 0).toFixed(2)} (${inv.clients?.name || 'client'}) will be marked as voided${itemNote}.`;

        const pendingAction = pendingActionManager.createAction({
          tenantId,
          userId,
          actionType: 'void_invoice',
          targetId: inv.id,
          description: `Void Invoice #${inv.invoice_number}`,
          impactSummary
        });

        return {
          result: {
            confirmation_required: true,
            actionId: pendingAction.actionId,
            actionType: 'void_invoice',
            targetId: inv.id,
            title: `Void Invoice #${inv.invoice_number}`,
            impactSummary,
            reason: reason || 'Contractor requested void'
          },
          mutation: null
        };
      }

      // --- Calendar & Scheduling Hub (Epic 18) ---
      case 'list_appointments': {
        const { start_date, end_date, status, client_id, job_id, limit = 50 } = args;
        const filters = { limit: Number(limit) || 50 };
        if (start_date) {
          filters.startDate = parseAppointmentTimeToUtc(start_date, timezone, false) || start_date;
        }
        if (end_date) {
          filters.endDate = parseAppointmentTimeToUtc(end_date, timezone, true) || end_date;
        }
        if (status) filters.status = status;

        if (client_id) {
          const cRes = await entityResolver.resolveClient(client_id, tenantId);
          if (cRes.status === 'resolved') filters.clientId = cRes.entity.id;
        }

        if (job_id) {
          const jRes = await entityResolver.resolveJob(job_id, tenantId);
          if (jRes.status === 'resolved') filters.jobId = jRes.entity.id;
        }

        try {
          const data = await appointmentService.getAppointments({ tenantId, filters });
          const formatted = (data || []).map(apt => formatAppointmentForAi(apt, timezone));
          return { result: formatted, mutation: null };
        } catch (err) {
          return { error: err.message };
        }
      }

      case 'get_appointment_details': {
        const { appointment_id } = args;
        const resolution = await resolveAppointmentOrError(appointment_id, tenantId);
        if (resolution.error) return { error: resolution.error };

        try {
          const apt = await appointmentService.getAppointmentById({
            tenantId,
            appointmentId: resolution.appointment.id
          });
          return { result: formatAppointmentForAi(apt, timezone), mutation: null };
        } catch (err) {
          return { error: err.message };
        }
      }

      case 'create_appointment': {
        const {
          title,
          start_time,
          end_time,
          all_day = false,
          color_tag = 'blue',
          client_id,
          job_id,
          property_id,
          location_address,
          contact_name,
          contact_phone,
          contact_role = 'billing_client',
          description,
          reminder_minutes = 60
        } = args;

        let resolvedClientId = null;
        if (client_id) {
          const cRes = await entityResolver.resolveClient(client_id, tenantId);
          if (cRes.status === 'resolved') resolvedClientId = cRes.entity.id;
        }

        let resolvedJobId = null;
        if (job_id) {
          const jRes = await entityResolver.resolveJob(job_id, tenantId);
          if (jRes.status === 'resolved') {
            resolvedJobId = jRes.entity.id;
            if (!resolvedClientId && jRes.entity.client_id) {
              resolvedClientId = jRes.entity.client_id;
            }
          }
        }

        // Convert local start_time to UTC
        const startUtc = parseAppointmentTimeToUtc(start_time, timezone, false) || start_time;

        // Calculate end_time defaulting to 1 hour after start_time if not provided
        let endUtc = end_time ? (parseAppointmentTimeToUtc(end_time, timezone, false) || end_time) : null;
        if (!endUtc && startUtc) {
          const startMs = new Date(startUtc).getTime();
          if (!isNaN(startMs)) {
            endUtc = new Date(startMs + 60 * 60 * 1000).toISOString();
          }
        }

        try {
          const appointmentData = {
            title,
            start_time: startUtc,
            end_time: endUtc,
            all_day: !!all_day,
            color_tag: color_tag || 'blue',
            client_id: resolvedClientId,
            job_id: resolvedJobId,
            property_id: property_id || null,
            location_address: location_address || null,
            contact_name: contact_name || null,
            contact_phone: contact_phone || null,
            contact_role: contact_role || 'billing_client',
            description: description || null,
            reminder_minutes: reminder_minutes !== undefined ? Number(reminder_minutes) : 60
          };

          const data = await appointmentService.createAppointment({
            tenantId,
            userId,
            appointmentData
          });

          return {
            result: formatAppointmentForAi(data, timezone),
            mutation: 'appointments',
            entityId: data.id
          };
        } catch (err) {
          return { error: err.message };
        }
      }

      case 'reschedule_appointment': {
        const { appointment_id, start_time, end_time, all_day, reason } = args;
        const resolution = await resolveAppointmentOrError(appointment_id, tenantId);
        if (resolution.error) return { error: resolution.error };
        const apt = resolution.appointment;

        const startUtc = parseAppointmentTimeToUtc(start_time, timezone, false) || start_time;
        let endUtc = end_time ? (parseAppointmentTimeToUtc(end_time, timezone, false) || end_time) : null;

        if (!endUtc && startUtc && apt.start_time && apt.end_time) {
          const origDuration = new Date(apt.end_time).getTime() - new Date(apt.start_time).getTime();
          const newStartMs = new Date(startUtc).getTime();
          if (!isNaN(newStartMs)) {
            endUtc = new Date(newStartMs + (origDuration > 0 ? origDuration : 3600000)).toISOString();
          }
        }

        try {
          const patchData = {
            start_time: startUtc,
            status: 'rescheduled'
          };
          if (endUtc) patchData.end_time = endUtc;
          if (all_day !== undefined) patchData.all_day = !!all_day;

          const data = await appointmentService.updateAppointment({
            tenantId,
            appointmentId: apt.id,
            patchData
          });

          const formatted = formatAppointmentForAi(data, timezone);
          return {
            result: {
              ...formatted,
              rescheduled_from: apt.start_time,
              rescheduled_to: startUtc,
              reason: reason || null
            },
            mutation: 'appointments',
            entityId: apt.id
          };
        } catch (err) {
          return { error: err.message };
        }
      }

      case 'update_appointment': {
        const { appointment_id, ...updates } = args;
        const resolution = await resolveAppointmentOrError(appointment_id, tenantId);
        if (resolution.error) return { error: resolution.error };
        const apt = resolution.appointment;

        const patchData = {};
        if (updates.title !== undefined) patchData.title = updates.title;
        if (updates.description !== undefined) patchData.description = updates.description;
        if (updates.status !== undefined) patchData.status = updates.status;
        if (updates.color_tag !== undefined) patchData.color_tag = updates.color_tag;
        if (updates.location_address !== undefined) patchData.location_address = updates.location_address;
        if (updates.contact_name !== undefined) patchData.contact_name = updates.contact_name;
        if (updates.contact_phone !== undefined) patchData.contact_phone = updates.contact_phone;
        if (updates.start_time) {
          patchData.start_time = parseAppointmentTimeToUtc(updates.start_time, timezone, false) || updates.start_time;
        }
        if (updates.end_time) {
          patchData.end_time = parseAppointmentTimeToUtc(updates.end_time, timezone, false) || updates.end_time;
        }

        if (updates.client_id) {
          const cRes = await entityResolver.resolveClient(updates.client_id, tenantId);
          if (cRes.status === 'resolved') patchData.client_id = cRes.entity.id;
        }
        if (updates.job_id) {
          const jRes = await entityResolver.resolveJob(updates.job_id, tenantId);
          if (jRes.status === 'resolved') patchData.job_id = jRes.entity.id;
        }

        try {
          const data = await appointmentService.updateAppointment({
            tenantId,
            appointmentId: apt.id,
            patchData
          });

          return {
            result: formatAppointmentForAi(data, timezone),
            mutation: 'appointments',
            entityId: apt.id
          };
        } catch (err) {
          return { error: err.message };
        }
      }

      case 'delete_appointment': {
        const { appointment_id, reason } = args;
        const resolution = await resolveAppointmentOrError(appointment_id, tenantId);
        if (resolution.error) return { error: resolution.error };
        const apt = resolution.appointment;

        try {
          await appointmentService.deleteAppointment({
            tenantId,
            appointmentId: apt.id
          });

          return {
            result: {
              success: true,
              deletedAppointment: apt,
              message: `Successfully deleted appointment "${apt.title}" scheduled for ${new Date(apt.start_time).toLocaleString()}.`,
              reason: reason || null
            },
            mutation: 'appointments',
            entityId: apt.id
          };
        } catch (err) {
          return { error: err.message };
        }
      }

      default:
        return { error: `Tool "${toolName}" is not implemented.` };
    }
  } catch (err) {
    return { error: `Tool execution failed: ${err.message}` };
  }
}
