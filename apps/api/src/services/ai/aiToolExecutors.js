import { supabase } from '../../config/supabase.js';
import { resolveEffectiveHourlyRate } from '../masterRates.js';
import { calculateInvoiceFinancials, roundCurrency } from '../pricingEngine.js';
import { pendingActionManager } from './pendingActionManager.js';

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
        const [clientRes, propertiesRes, jobsRes] = await Promise.all([
          supabase.from('clients').select('*').eq('id', client_id).eq('tenant_id', tenantId).single(),
          supabase.from('rental_properties').select('*').eq('client_id', client_id).eq('tenant_id', tenantId),
          supabase.from('jobs').select('id, title, status, start_date, rate_type').eq('client_id', client_id).eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(10)
        ]);

        if (clientRes.error || !clientRes.data) {
          return { error: 'Client not found or access denied.' };
        }

        return {
          result: {
            client: clientRes.data,
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
        const payload = {};
        if (updates.name) payload.name = updates.name.trim();
        if (updates.email) payload.email = updates.email.trim().toLowerCase();
        if (updates.phone) payload.phone = updates.phone.replace(/[^\d+]/g, '');
        if (updates.address) payload.address = updates.address.trim();
        if (updates.notes !== undefined) payload.notes = updates.notes;

        const { data, error } = await supabase
          .from('clients')
          .update(payload)
          .eq('id', client_id)
          .eq('tenant_id', tenantId)
          .select()
          .single();

        if (error) return { error: error.message };
        return { result: data, mutation: 'clients', entityId: client_id };
      }

      case 'list_jobs': {
        const { status, client_id, limit = 20 } = args;
        let dbQuery = supabase
          .from('jobs')
          .select('id, title, status, rate_type, hourly_rate, flat_rate, start_date, client_id, clients(name)')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(Math.min(limit, 50));

        if (status) dbQuery = dbQuery.eq('status', status);
        if (client_id) dbQuery = dbQuery.eq('client_id', client_id);

        const { data, error } = await dbQuery;
        if (error) return { error: error.message };
        return { result: data || [], mutation: null };
      }

      case 'get_job_details': {
        const { job_id } = args;
        const [jobRes, hoursRes, materialsRes] = await Promise.all([
          supabase.from('jobs').select('*, clients(name, email, phone)').eq('id', job_id).eq('tenant_id', tenantId).single(),
          supabase.from('job_hours').select('*').eq('job_id', job_id).order('date', { ascending: false }),
          supabase.from('job_materials').select('*').eq('job_id', job_id).order('created_at', { ascending: false })
        ]);

        if (jobRes.error || !jobRes.data) {
          return { error: 'Job not found or access denied.' };
        }

        const totalHours = (hoursRes.data || []).reduce((sum, h) => sum + Number(h.hours || 0), 0);
        const totalMaterialsCost = (materialsRes.data || []).reduce((sum, m) => sum + Number(m.cost || 0), 0);

        return {
          result: {
            job: jobRes.data,
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
        
        // Resolve rate type and effective hourly rate using masterRates
        const finalHourlyRate = rate_type === 'hourly' 
          ? (typeof hourly_rate === 'number' && hourly_rate > 0 ? hourly_rate : resolveEffectiveHourlyRate({ rateType: 'hourly' }))
          : null;

        const { data, error } = await supabase
          .from('jobs')
          .insert([{
            tenant_id: tenantId,
            client_id,
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
        const { data, error } = await supabase
          .from('jobs')
          .update({ status })
          .eq('id', job_id)
          .eq('tenant_id', tenantId)
          .select()
          .single();

        if (error) return { error: error.message };
        return { result: data, mutation: 'jobs', entityId: job_id };
      }

      case 'log_job_hours': {
        const { job_id, hours, date, description, start_time, end_time } = args;

        // Verify job belongs to this tenant
        const { data: job, error: jobErr } = await supabase
          .from('jobs')
          .select('id, title')
          .eq('id', job_id)
          .eq('tenant_id', tenantId)
          .single();

        if (jobErr || !job) {
          return { error: 'Job not found or unauthorized.' };
        }

        const { data, error } = await supabase
          .from('job_hours')
          .insert([{
            job_id,
            hours: parseFloat(hours),
            date: date || new Date().toISOString().split('T')[0],
            description: description.trim(),
            start_time: start_time || null,
            end_time: end_time || null,
            billing_status: 'unbilled'
          }])
          .select()
          .single();

        if (error) {
          console.error('[AI Tool Executor] log_job_hours error:', error);
          return { error: error.message };
        }
        return { result: data, mutation: 'hours', entityId: job_id };
      }

      case 'log_job_materials': {
        const { job_id, description, cost, store, purchase_date, notes, is_from_stock } = args;

        // Verify job belongs to this tenant
        const { data: job, error: jobErr } = await supabase
          .from('jobs')
          .select('id, title')
          .eq('id', job_id)
          .eq('tenant_id', tenantId)
          .single();

        if (jobErr || !job) {
          return { error: 'Job not found or unauthorized.' };
        }

        const { data, error } = await supabase
          .from('job_materials')
          .insert([{
            job_id,
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
        return { result: data, mutation: 'materials', entityId: job_id };
      }

      // --- Invoicing & Billing Tools (Phase 3) ---
      case 'draft_invoice': {
        const { client_id, job_id, labor_title, due_date, tax_rate_percent, markup_amount, notes } = args;

        let targetClientId = client_id;
        let lineItems = [];
        let baseLabor = 0;
        let linkedJobTitle = labor_title || 'General Contracting Labor';

        // 1. If job_id is provided, resolve job, client_id, labor rate, and unbilled items
        if (job_id) {
          const { data: job, error: jobErr } = await supabase
            .from('jobs')
            .select('id, title, client_id, rate_type, hourly_rate, flat_rate')
            .eq('id', job_id)
            .eq('tenant_id', tenantId)
            .single();

          if (jobErr || !job) {
            return { error: 'Job not found or unauthorized.' };
          }

          if (!targetClientId) {
            targetClientId = job.client_id;
          }
          linkedJobTitle = labor_title || job.title;

          // Pull unbilled hours (scoped via job_id, no tenant_id column)
          const { data: hoursList } = await supabase
            .from('job_hours')
            .select('*')
            .eq('job_id', job_id)
            .eq('billing_status', 'unbilled');

          // Pull unbilled materials (scoped via job_id, no tenant_id column)
          const { data: materialsList } = await supabase
            .from('job_materials')
            .select('*')
            .eq('job_id', job_id)
            .eq('billing_status', 'unbilled');

          // Calculate labor amount
          if (job.rate_type === 'hourly') {
            const rate = job.hourly_rate || resolveEffectiveHourlyRate({ isEmergency: false });
            const totalHours = (hoursList || []).reduce((sum, h) => sum + Number(h.hours || 0), 0);
            baseLabor = roundCurrency(totalHours * rate);
          } else {
            baseLabor = roundCurrency(job.flat_rate || 0);
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

        if (!targetClientId) {
          return { error: 'A valid client_id or job_id is required to draft an invoice.' };
        }

        // 2. Verify client belongs to this tenant
        const { data: client, error: clientErr } = await supabase
          .from('clients')
          .select('id, name')
          .eq('id', targetClientId)
          .eq('tenant_id', tenantId)
          .single();

        if (clientErr || !client) return { error: 'Client not found or unauthorized.' };

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
            client_id: targetClientId,
            job_id: job_id || null,
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

        // 6. Insert line items if any (note: invoice_line_items has no tenant_id column)
        if (lineItems.length > 0) {
          const itemsToInsert = lineItems.map((item, idx) => ({
            invoice_id: newInvoice.id,
            source_type: item.source_type,
            source_id: item.source_id,
            description: item.description,
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
        if (job_id) {
          await supabase
            .from('job_hours')
            .update({ billing_status: 'on_draft', invoice_id: newInvoice.id })
            .eq('job_id', job_id)
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

        const { data: inv, error: invErr } = await supabase
          .from('invoices')
          .select('*')
          .eq('id', invoice_id)
          .eq('tenant_id', tenantId)
          .single();

        if (invErr || !inv) return { error: 'Invoice not found or unauthorized.' };
        if (inv.status !== 'draft') return { error: 'Cannot modify non-draft invoices.' };

        const { data: lineItem, error: itemErr } = await supabase
          .from('invoice_line_items')
          .insert([{
            invoice_id,
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
          .eq('invoice_id', invoice_id);

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
          .eq('id', invoice_id);

        return { result: lineItem, mutation: 'invoices', entityId: invoice_id };
      }

      case 'update_invoice_status': {
        const { invoice_id, status } = args;

        const { data, error } = await supabase
          .from('invoices')
          .update({ status })
          .eq('id', invoice_id)
          .eq('tenant_id', tenantId)
          .select()
          .single();

        if (error) return { error: error.message };

        await supabase.from('invoice_logs').insert([{
          tenant_id: tenantId,
          invoice_id,
          action: status,
          reason: 'Updated via AI Copilot'
        }]);

        return { result: data, mutation: 'invoices', entityId: invoice_id };
      }

      case 'get_invoice_details': {
        const { invoice_id } = args;

        const { data, error } = await supabase
          .from('invoices')
          .select(`
            *,
            clients (id, name, email, phone),
            jobs (id, title),
            invoice_line_items (*)
          `)
          .eq('id', invoice_id)
          .eq('tenant_id', tenantId)
          .single();

        if (error) return { error: error.message };
        return { result: data };
      }

      // --- Destructive Action Safety Interceptors (Human-in-the-Loop) ---
      case 'request_delete_job': {
        const { job_id, reason } = args;

        const { data: job, error: jobErr } = await supabase
          .from('jobs')
          .select('id, title, status, clients(name)')
          .eq('id', job_id)
          .eq('tenant_id', tenantId)
          .single();

        if (jobErr || !job) return { error: 'Job not found or unauthorized.' };

        // Count cascade impact
        const [hoursCount, matsCount] = await Promise.all([
          supabase.from('job_hours').select('id', { count: 'exact', head: true }).eq('job_id', job_id),
          supabase.from('job_materials').select('id', { count: 'exact', head: true }).eq('job_id', job_id)
        ]);

        const impactSummary = `Job "${job.title}" for ${job.clients?.name || 'client'} has ${hoursCount.count || 0} logged time entries and ${matsCount.count || 0} materials records.`;

        const pendingAction = pendingActionManager.createAction({
          tenantId,
          userId,
          actionType: 'delete_job',
          targetId: job_id,
          description: `Permanently delete Job "${job.title}"`,
          impactSummary
        });

        return {
          result: {
            confirmation_required: true,
            actionId: pendingAction.actionId,
            actionType: 'delete_job',
            targetId: job_id,
            title: `Delete Job "${job.title}"`,
            impactSummary,
            reason: reason || 'Contractor requested deletion'
          },
          mutation: null
        };
      }

      case 'request_delete_client': {
        const { client_id, reason } = args;

        const { data: client, error: clientErr } = await supabase
          .from('clients')
          .select('id, name')
          .eq('id', client_id)
          .eq('tenant_id', tenantId)
          .single();

        if (clientErr || !client) return { error: 'Client not found or unauthorized.' };

        const { count: jobCount } = await supabase
          .from('jobs')
          .select('id', { count: 'exact', head: true })
          .eq('client_id', client_id);

        const impactSummary = `Client "${client.name}" has ${jobCount || 0} associated jobs.`;

        const pendingAction = pendingActionManager.createAction({
          tenantId,
          userId,
          actionType: 'delete_client',
          targetId: client_id,
          description: `Permanently delete Client "${client.name}"`,
          impactSummary
        });

        return {
          result: {
            confirmation_required: true,
            actionId: pendingAction.actionId,
            actionType: 'delete_client',
            targetId: client_id,
            title: `Delete Client "${client.name}"`,
            impactSummary,
            reason: reason || 'Contractor requested deletion'
          },
          mutation: null
        };
      }

      case 'request_void_invoice': {
        const { invoice_id, reason } = args;

        const { data: inv, error: invErr } = await supabase
          .from('invoices')
          .select('id, invoice_number, total_amount, status, clients(name)')
          .eq('id', invoice_id)
          .eq('tenant_id', tenantId)
          .single();

        if (invErr || !inv) return { error: 'Invoice not found or unauthorized.' };

        const impactSummary = `Invoice #${inv.invoice_number} for $${Number(inv.total_amount).toFixed(2)} (${inv.clients?.name || 'client'}) will be marked as voided.`;

        const pendingAction = pendingActionManager.createAction({
          tenantId,
          userId,
          actionType: 'void_invoice',
          targetId: invoice_id,
          description: `Void Invoice #${inv.invoice_number}`,
          impactSummary
        });

        return {
          result: {
            confirmation_required: true,
            actionId: pendingAction.actionId,
            actionType: 'void_invoice',
            targetId: invoice_id,
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
