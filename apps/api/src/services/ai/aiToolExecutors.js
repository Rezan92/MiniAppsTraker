import { supabase } from '../../config/supabase.js';
import { resolveEffectiveHourlyRate } from '../masterRates.js';

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

      default:
        return { error: `Tool "${toolName}" is not implemented.` };
    }
  } catch (err) {
    return { error: `Tool execution failed: ${err.message}` };
  }
}
