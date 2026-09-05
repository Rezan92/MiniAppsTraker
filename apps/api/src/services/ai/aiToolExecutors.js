import { supabase } from '../../config/supabase.js';
import { resolveEffectiveHourlyRate } from '../masterRates.js';
import { calculateInvoiceFinancials, roundCurrency } from '../pricingEngine.js';
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
 * Executes an AI tool call securely within tenant boundaries.
 * @param {string} toolName
 * @param {Object} args
 * @param {Object} context
 * @param {string} context.tenantId - Verified from request session
 * @param {string} context.userId - Verified from request session
 * @returns {Promise<{ result?: any, error?: string, mutation?: string|null, entityId?: string }>}
 */
export async function executeAiTool(toolName, args = {}, { tenantId, userId }) {
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
        const normalizedPhone = phone ? phone.replace(/[^\d+]/g, '') : null;

        const { data, error } = await supabase
          .from('clients')
          .insert([{
            tenant_id: tenantId,
            name: name.trim(),
            email: email ? email.trim().toLowerCase() : null,
            phone: normalizedPhone || null,
            address: address ? address.trim() : null,
            client_type: client_type || 'residential',
            notes: notes || null,
            status: 'active'
          }])
          .select()
          .single();

        if (error) return { error: error.message };
        return { result: data, mutation: 'clients', entityId: data.id };
      }

      case 'update_client': {
        const { client_id, ...updates } = args;
        const resolution = await resolveClientOrError(client_id, tenantId);
        if (resolution.error) return { error: resolution.error };
        const client = resolution.client;

        const payload = {};
        if (updates.name) payload.name = updates.name.trim();
        if (updates.email) payload.email = updates.email.trim().toLowerCase();
        if (updates.phone) payload.phone = updates.phone.replace(/[^\d+]/g, '');
        if (updates.address) payload.address = updates.address.trim();
        if (updates.notes !== undefined) payload.notes = updates.notes;

        const { data, error } = await supabase
          .from('clients')
          .update(payload)
          .eq('id', client.id)
          .eq('tenant_id', tenantId)
          .select()
          .single();

        if (error) return { error: error.message };
        return { result: data, mutation: 'clients', entityId: client.id };
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

        const [hoursRes, materialsRes] = await Promise.all([
          supabase.from('job_hours').select('*').eq('job_id', job.id).order('date', { ascending: false }),
          supabase.from('job_materials').select('*').eq('job_id', job.id).order('created_at', { ascending: false })
        ]);

        const totalHours = (hoursRes.data || []).reduce((sum, h) => sum + Number(h.hours || 0), 0);
        const totalMaterialsCost = (materialsRes.data || []).reduce((sum, m) => sum + Number(m.cost || 0), 0);

        return {
          result: {
            job,
            hours: hoursRes.data || [],
            materials: materialsRes.data || [],
            totals: {
              totalHours,
              totalMaterialsCost
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

        // Resolve rate type and effective hourly rate using masterRates
        const finalHourlyRate = rate_type === 'hourly' 
          ? (typeof hourly_rate === 'number' && hourly_rate > 0 ? hourly_rate : resolveEffectiveHourlyRate({ rateType: 'hourly' }))
          : null;

        const { data, error } = await supabase
          .from('jobs')
          .insert([{
            tenant_id: tenantId,
            client_id: client.id,
            title: title.trim(),
            rate_type,
            hourly_rate: finalHourlyRate,
            flat_rate: rate_type === 'flat' ? (Number(flat_rate) || 0) : null,
            start_date: start_date || new Date().toISOString().split('T')[0],
            status: status || 'open',
            notes: notes || null
          }])
          .select('*, clients(name)')
          .single();

        if (error) return { error: error.message };
        return { result: data, mutation: 'jobs', entityId: data.id };
      }

      case 'update_job_status': {
        const { job_id, status } = args;
        const resolution = await resolveJobOrError(job_id, tenantId);
        if (resolution.error) return { error: resolution.error };
        const job = resolution.job;

        const { data, error } = await supabase
          .from('jobs')
          .update({ status })
          .eq('id', job.id)
          .eq('tenant_id', tenantId)
          .select()
          .single();

        if (error) return { error: error.message };
        return { result: data, mutation: 'jobs', entityId: job.id };
      }

      case 'log_job_hours': {
        const { job_id, hours, date, description, start_time, end_time } = args;
        const resolution = await resolveJobOrError(job_id, tenantId);
        if (resolution.error) return { error: resolution.error };
        const job = resolution.job;

        const parsedHours = parseFloat(hours) || 0;
        // Mirror manual modal behavior: default start_time to '01:00' and calculate end_time if omitted
        const finalStartTime = normalizeTimeTo24Hour(start_time) || '01:00';
        const finalEndTime = normalizeTimeTo24Hour(end_time) || addHoursToTime(finalStartTime, parsedHours);

        const { data, error } = await supabase
          .from('job_hours')
          .insert([{
            job_id: job.id,
            hours: parsedHours,
            date: date || new Date().toISOString().split('T')[0],
            description: (description || 'Labor work').trim(),
            start_time: finalStartTime,
            end_time: finalEndTime,
            billing_status: 'unbilled'
          }])
          .select()
          .single();

        if (error) {
          console.error('[AI Tool Executor] log_job_hours error:', error);
          return { error: error.message };
        }
        return { result: data, mutation: 'hours', entityId: job.id };
      }

      case 'log_job_materials': {
        const { job_id, description, cost, store, purchase_date, notes, is_from_stock } = args;
        const resolution = await resolveJobOrError(job_id, tenantId);
        if (resolution.error) return { error: resolution.error };
        const job = resolution.job;

        const { data, error } = await supabase
          .from('job_materials')
          .insert([{
            job_id: job.id,
            description: description.trim(),
            cost: parseFloat(cost),
            store: store ? store.trim() : null,
            purchase_date: purchase_date || new Date().toISOString().split('T')[0],
            notes: notes || null,
            is_from_stock: Boolean(is_from_stock)
          }])
          .select()
          .single();

        if (error) {
          console.error('[AI Tool Executor] log_job_materials error:', error);
          return { error: error.message };
        }
        return { result: data, mutation: 'materials', entityId: job.id };
      }

      // --- Invoicing & Billing Tools (Phase 3 + Itemized Labor) ---
      case 'draft_invoice': {
        const { client_id, job_id, labor_title, due_date, tax_rate_percent, markup_amount, notes } = args;

        let targetClientId = null;
        let job = null;
        let lineItems = [];
        let baseLabor = 0;
        let linkedJobTitle = labor_title || 'General Contracting Labor';

        // 1. Resolve Job if provided
        if (job_id) {
          const jobRes = await resolveJobOrError(job_id, tenantId);
          if (jobRes.error) return { error: jobRes.error };
          job = jobRes.job;
          targetClientId = job.client_id;
          linkedJobTitle = labor_title || job.title;

          // Pull unbilled hours (scoped via job_id, no tenant_id column)
          const { data: hoursList } = await supabase
            .from('job_hours')
            .select('*')
            .eq('job_id', job.id)
            .eq('billing_status', 'unbilled')
            .order('date', { ascending: true });

          // Pull unbilled materials (scoped via job_id, no tenant_id column)
          const { data: materialsList } = await supabase
            .from('job_materials')
            .select('*')
            .eq('job_id', job.id)
            .eq('billing_status', 'unbilled')
            .order('purchase_date', { ascending: true });

          // Calculate labor and generate itemized labor line items
          if (job.rate_type === 'hourly') {
            const rate = job.hourly_rate || resolveEffectiveHourlyRate({ isEmergency: false });
            for (const h of (hoursList || [])) {
              const hCost = roundCurrency(Number(h.hours || 0) * rate);
              baseLabor = roundCurrency(baseLabor + hCost);
              lineItems.push({
                source_type: 'labor',
                source_id: h.id,
                description: h.description ? `${h.description} (${h.hours} hrs @ $${rate}/hr)` : `${h.hours} hrs worked @ $${rate}/hr`,
                service_date: h.date,
                amount: hCost,
                is_billable: true
              });
            }
          } else {
            baseLabor = roundCurrency(job.flat_rate || 0);
            lineItems.push({
              source_type: 'labor',
              description: linkedJobTitle || 'Flat Rate Project Labor',
              amount: baseLabor,
              is_billable: true
            });
          }

          // Build material line items
          for (const m of (materialsList || [])) {
            lineItems.push({
              source_type: 'material',
              source_id: m.id,
              description: m.description,
              amount: roundCurrency(m.cost),
              is_billable: true
            });
          }
        }

        // 2. Resolve Client if client_id explicitly given or inferred
        const clientQuery = client_id || targetClientId;
        if (!clientQuery) {
          return { error: 'A valid client or job is required to draft an invoice.' };
        }

        const clientRes = await resolveClientOrError(clientQuery, tenantId);
        if (clientRes.error) return { error: clientRes.error };
        const client = clientRes.client;

        // 3. Deterministic financial calculations via pricingEngine.js (Rule 10)
        const financials = calculateInvoiceFinancials({
          baseLaborAmount: baseLabor,
          lineItems,
          markupAmount: markup_amount || 0,
          taxRatePercent: tax_rate_percent || 0
        });

        // 4. Fetch sequential invoice number from tenant record
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('next_invoice_number')
          .eq('id', tenantId)
          .single();

        const nextNum = tenantData?.next_invoice_number || 1001;
        const invoiceNumber = `${nextNum}`;
        const defaultDueDate = due_date || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

        // 5. Insert invoice (strictly existing database columns)
        const { data: newInvoice, error: invErr } = await supabase
          .from('invoices')
          .insert([{
            tenant_id: tenantId,
            client_id: client.id,
            job_id: job ? job.id : null,
            invoice_number: invoiceNumber,
            invoice_date: new Date().toISOString().split('T')[0],
            due_date: defaultDueDate,
            labor_title: linkedJobTitle,
            labor_notes: notes || null,
            labor_amount: financials.laborAmount,
            materials_amount: financials.materialsAmount,
            total_amount: financials.totalAmount,
            status: 'draft'
          }])
          .select()
          .single();

        if (invErr) {
          console.error('[AI Tool Executor] draft_invoice error:', invErr);
          return { error: invErr.message };
        }

        // Increment tenant next_invoice_number
        await supabase
          .from('tenants')
          .update({ next_invoice_number: nextNum + 1 })
          .eq('id', tenantId);

        // 6. Insert itemized line items (with service_date and is_billable)
        if (lineItems.length > 0) {
          const itemsToInsert = lineItems.map((item, idx) => ({
            invoice_id: newInvoice.id,
            source_type: item.source_type,
            source_id: item.source_id || null,
            description: item.description,
            service_date: item.service_date || null,
            amount: item.amount,
            sort_order: idx,
            is_billable: true
          }));
          await supabase.from('invoice_line_items').insert(itemsToInsert);

          // Update billed status of materials
          const matIds = lineItems.filter(i => i.source_type === 'material').map(i => i.source_id).filter(Boolean);
          if (matIds.length > 0) {
            await supabase
              .from('job_materials')
              .update({ billing_status: 'on_draft', invoice_id: newInvoice.id })
              .in('id', matIds);
          }
        }

        // Update billed status of hours if job was linked
        if (job) {
          await supabase
            .from('job_hours')
            .update({ billing_status: 'on_draft', invoice_id: newInvoice.id })
            .eq('job_id', job.id)
            .eq('billing_status', 'unbilled');
        }

        // 7. Insert audit log in invoice_logs
        await supabase.from('invoice_logs').insert([{
          tenant_id: tenantId,
          invoice_id: newInvoice.id,
          action: 'Created',
          reason: 'Drafted via AI Copilot'
        }]);

        return {
          result: {
            invoiceId: newInvoice.id,
            invoiceNumber: newInvoice.invoice_number,
            clientName: client.name,
            totalAmount: financials.totalAmount,
            subtotal: financials.subtotal,
            taxAmount: financials.taxAmount,
            status: 'draft',
            dueDate: defaultDueDate
          },
          mutation: 'invoices',
          entityId: newInvoice.id
        };
      }

      case 'add_invoice_line_item': {
        const { invoice_id, description, amount, source_type } = args;
        const resolution = await resolveInvoiceOrError(invoice_id, tenantId);
        if (resolution.error) return { error: resolution.error };
        const inv = resolution.invoice;

        if (inv.status !== 'draft') return { error: 'Cannot modify non-draft invoices.' };

        const { data: lineItem, error: itemErr } = await supabase
          .from('invoice_line_items')
          .insert([{
            invoice_id: inv.id,
            source_type: source_type || 'ad_hoc',
            description: description.trim(),
            amount: roundCurrency(amount),
            is_billable: true
          }])
          .select()
          .single();

        if (itemErr) return { error: itemErr.message };

        // Recalculate totals
        const { data: allItems } = await supabase
          .from('invoice_line_items')
          .select('*')
          .eq('invoice_id', inv.id);

        const financials = calculateInvoiceFinancials({
          baseLaborAmount: inv.labor_amount,
          lineItems: allItems || []
        });

        await supabase
          .from('invoices')
          .update({
            materials_amount: financials.materialsAmount,
            total_amount: financials.totalAmount
          })
          .eq('id', inv.id);

        return { result: lineItem, mutation: 'invoices', entityId: inv.id };
      }

      case 'update_invoice_status': {
        const { invoice_id, status } = args;
        const resolution = await resolveInvoiceOrError(invoice_id, tenantId);
        if (resolution.error) return { error: resolution.error };
        const inv = resolution.invoice;

        // Invoices in draft, ready_to_send, or disputed must not be directly voided
        if (status === 'voided' && ['draft', 'ready_to_send', 'disputed'].includes(inv.status)) {
          return { error: `Invoice #${inv.invoice_number} is in "${inv.status}" status. Invoices in draft or disputed status should be deleted, not voided. Please request invoice deletion.` };
        }

        const updateData = { status };
        if (status === 'paid') updateData.paid_at = new Date().toISOString();

        const { data, error } = await supabase
          .from('invoices')
          .update(updateData)
          .eq('id', inv.id)
          .eq('tenant_id', tenantId)
          .select()
          .single();

        if (error) return { error: error.message };

        // Synchronize job billing items
        const { data: lines } = await supabase
          .from('invoice_line_items')
          .select('source_id, source_type')
          .eq('invoice_id', inv.id);

        if (lines && lines.length > 0) {
          const matIds = lines.filter(i => i.source_type === 'material' && i.source_id).map(i => i.source_id);
          const labIds = lines.filter(i => i.source_type === 'labor' && i.source_id).map(i => i.source_id);

          if (status === 'sent' || status === 'paid') {
            if (matIds.length) await supabase.from('job_materials').update({ billing_status: 'billed' }).in('id', matIds);
            if (labIds.length) await supabase.from('job_hours').update({ billing_status: 'billed' }).in('id', labIds);
          } else if (status === 'voided') {
            if (matIds.length) await supabase.from('job_materials').update({ billing_status: 'unbilled', invoice_id: null }).in('id', matIds);
            if (labIds.length) await supabase.from('job_hours').update({ billing_status: 'unbilled', invoice_id: null }).in('id', labIds);
          } else if (status === 'draft' || status === 'ready_to_send') {
            if (matIds.length) await supabase.from('job_materials').update({ billing_status: 'on_draft' }).in('id', matIds);
            if (labIds.length) await supabase.from('job_hours').update({ billing_status: 'on_draft' }).in('id', labIds);
          }
        }

        await supabase.from('invoice_logs').insert([{
          tenant_id: tenantId,
          invoice_id: inv.id,
          action: status,
          reason: 'Updated via AI Copilot'
        }]);

        return { result: data, mutation: 'invoices', entityId: inv.id };
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

      default:
        return { error: `Tool "${toolName}" is not implemented.` };
    }
  } catch (err) {
    return { error: `Tool execution failed: ${err.message}` };
  }
}
