import { supabase } from '../../config/supabase.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Universal Entity Resolver
 * Translates human identifiers (invoice numbers, job titles, client names) or database UUIDs
 * into verified tenant-isolated database records with disambiguation handling.
 */
export const entityResolver = {
  /**
   * Resolves a client by UUID, exact name, or fuzzy substring.
   * @param {string} identifier - UUID or name/company
   * @param {string} tenantId - Tenant boundary
   * @returns {Promise<{ status: 'resolved'|'ambiguous'|'not_found', entity?: any, candidates?: any[] }>}
   */
  async resolveClient(identifier, tenantId) {
    if (!identifier || !tenantId) return { status: 'not_found' };
    const raw = String(identifier).trim();

    // 1. Direct UUID Lookup
    if (UUID_REGEX.test(raw)) {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', raw)
        .eq('tenant_id', tenantId)
        .single();

      if (!error && data) {
        return { status: 'resolved', entity: data };
      }
    }

    // 2. Exact Name Match (Case-Insensitive)
    const { data: exactMatches } = await supabase
      .from('clients')
      .select('*')
      .eq('tenant_id', tenantId)
      .or(`name.ilike."${raw}",company_name.ilike."${raw}"`);

    if (exactMatches && exactMatches.length === 1) {
      return { status: 'resolved', entity: exactMatches[0] };
    }
    if (exactMatches && exactMatches.length > 1) {
      return { status: 'ambiguous', candidates: exactMatches };
    }

    // 3. Substring Fuzzy Match
    const { data: fuzzyMatches } = await supabase
      .from('clients')
      .select('*')
      .eq('tenant_id', tenantId)
      .or(`name.ilike."%${raw}%",company_name.ilike."%${raw}%"`)
      .limit(5);

    if (!fuzzyMatches || fuzzyMatches.length === 0) {
      return { status: 'not_found' };
    }

    if (fuzzyMatches.length === 1) {
      return { status: 'resolved', entity: fuzzyMatches[0] };
    }

    return { status: 'ambiguous', candidates: fuzzyMatches };
  },

  /**
   * Resolves a job by UUID, exact title, or fuzzy substring.
   * @param {string} identifier - UUID or title
   * @param {string} tenantId - Tenant boundary
   * @param {Object} [options]
   * @param {string} [options.clientId] - Optional client boundary filter
   * @returns {Promise<{ status: 'resolved'|'ambiguous'|'not_found', entity?: any, candidates?: any[] }>}
   */
  async resolveJob(identifier, tenantId, { clientId } = {}) {
    if (!identifier || !tenantId) return { status: 'not_found' };
    const raw = String(identifier).trim();

    // 1. Direct UUID Lookup
    if (UUID_REGEX.test(raw)) {
      let query = supabase
        .from('jobs')
        .select('*, clients(id, name)')
        .eq('id', raw)
        .eq('tenant_id', tenantId);

      if (clientId) query = query.eq('client_id', clientId);
      const { data, error } = await query.single();

      if (!error && data) {
        return { status: 'resolved', entity: data };
      }
    }

    // 2. Exact Title Match
    let exactQuery = supabase
      .from('jobs')
      .select('*, clients(id, name)')
      .eq('tenant_id', tenantId)
      .ilike('title', raw);

    if (clientId) exactQuery = exactQuery.eq('client_id', clientId);
    const { data: exactMatches } = await exactQuery;

    if (exactMatches && exactMatches.length === 1) {
      return { status: 'resolved', entity: exactMatches[0] };
    }
    if (exactMatches && exactMatches.length > 1) {
      return { status: 'ambiguous', candidates: exactMatches };
    }

    // 3. Substring Fuzzy Match
    let fuzzyQuery = supabase
      .from('jobs')
      .select('*, clients(id, name)')
      .eq('tenant_id', tenantId)
      .ilike('title', `%${raw}%`)
      .limit(5);

    if (clientId) fuzzyQuery = fuzzyQuery.eq('client_id', clientId);
    const { data: fuzzyMatches } = await fuzzyQuery;

    if (!fuzzyMatches || fuzzyMatches.length === 0) {
      return { status: 'not_found' };
    }

    if (fuzzyMatches.length === 1) {
      return { status: 'resolved', entity: fuzzyMatches[0] };
    }

    return { status: 'ambiguous', candidates: fuzzyMatches };
  },

  /**
   * Resolves an invoice by UUID, human invoice number (e.g. "1027", "INV-1027"), or job title.
   * @param {string} identifier - UUID, invoice number, or title
   * @param {string} tenantId - Tenant boundary
   * @returns {Promise<{ status: 'resolved'|'ambiguous'|'not_found', entity?: any, candidates?: any[] }>}
   */
  async resolveInvoice(identifier, tenantId) {
    if (!identifier || !tenantId) return { status: 'not_found' };
    const raw = String(identifier).trim();

    // 1. Direct UUID Lookup
    if (UUID_REGEX.test(raw)) {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, clients(id, name), jobs(id, title)')
        .eq('id', raw)
        .eq('tenant_id', tenantId)
        .single();

      if (!error && data) {
        return { status: 'resolved', entity: data };
      }
    }

    // 2. Numeric / Clean Invoice Number Lookup (e.g. "1027" or "INV-1027")
    const cleanNumber = raw.replace(/^INV-?/i, '').trim();
    if (cleanNumber && /^\d+$/.test(cleanNumber)) {
      const { data: numMatches } = await supabase
        .from('invoices')
        .select('*, clients(id, name), jobs(id, title)')
        .eq('tenant_id', tenantId)
        .or(`invoice_number.eq."${cleanNumber}",invoice_number.eq."INV-${cleanNumber}"`);

      if (numMatches && numMatches.length === 1) {
        return { status: 'resolved', entity: numMatches[0] };
      }
      if (numMatches && numMatches.length > 1) {
        return { status: 'ambiguous', candidates: numMatches };
      }
    }

    // 3. Match by Invoice Number String
    const { data: exactNumberMatches } = await supabase
      .from('invoices')
      .select('*, clients(id, name), jobs(id, title)')
      .eq('tenant_id', tenantId)
      .ilike('invoice_number', raw);

    if (exactNumberMatches && exactNumberMatches.length === 1) {
      return { status: 'resolved', entity: exactNumberMatches[0] };
    }

    // 4. Substring Search across invoice_number or labor_title
    const { data: fuzzyMatches } = await supabase
      .from('invoices')
      .select('*, clients(id, name), jobs(id, title)')
      .eq('tenant_id', tenantId)
      .or(`invoice_number.ilike."%${raw}%",labor_title.ilike."%${raw}%"`)
      .limit(5);

    if (!fuzzyMatches || fuzzyMatches.length === 0) {
      return { status: 'not_found' };
    }

    if (fuzzyMatches.length === 1) {
      return { status: 'resolved', entity: fuzzyMatches[0] };
    }

    return { status: 'ambiguous', candidates: fuzzyMatches };
  },

  /**
   * Resolves a job material item by UUID, description substring, or cost.
   * @param {string} identifier - UUID, description (e.g. "Homer Bucket", "sponge"), or cost
   * @param {string} jobId - Job boundary
   * @param {string} tenantId - Tenant boundary
   * @returns {Promise<{ status: 'resolved'|'ambiguous'|'not_found', entity?: any, candidates?: any[] }>}
   */
  async resolveJobMaterial(identifier, jobId, tenantId) {
    if (!identifier || !jobId || !tenantId) return { status: 'not_found' };
    const raw = String(identifier).trim();

    // Verify job exists and belongs to tenant
    const { data: job, error: jobErr } = await supabase
      .from('jobs')
      .select('id')
      .eq('id', jobId)
      .eq('tenant_id', tenantId)
      .single();

    if (jobErr || !job) {
      return { status: 'not_found' };
    }

    // 1. Fetch all materials for this job
    const { data: materials, error } = await supabase
      .from('job_materials')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });

    if (error || !materials || materials.length === 0) {
      return { status: 'not_found' };
    }

    // 2. Direct UUID Match
    if (UUID_REGEX.test(raw)) {
      const match = materials.find(m => m.id.toLowerCase() === raw.toLowerCase());
      if (match) return { status: 'resolved', entity: match };
    }

    // 3. Exact Description Match (case-insensitive)
    const exactMatches = materials.filter(m => m.description?.toLowerCase() === raw.toLowerCase());
    if (exactMatches.length === 1) {
      return { status: 'resolved', entity: exactMatches[0] };
    }
    if (exactMatches.length > 1) {
      return { status: 'ambiguous', candidates: exactMatches };
    }

    // 4. Substring Description Match (case-insensitive)
    const lowerRaw = raw.toLowerCase().replace(/^\$/, '');
    const substringMatches = materials.filter(m => 
      m.description?.toLowerCase().includes(lowerRaw) ||
      (m.store && m.store.toLowerCase().includes(lowerRaw))
    );

    if (substringMatches.length === 1) {
      return { status: 'resolved', entity: substringMatches[0] };
    }
    if (substringMatches.length > 1) {
      return { status: 'ambiguous', candidates: substringMatches };
    }

    // 5. Cost Match (if identifier is a number like 45.80 or $45.80)
    const parsedCost = parseFloat(lowerRaw);
    if (!isNaN(parsedCost)) {
      const costMatches = materials.filter(m => Math.abs(Number(m.cost) - parsedCost) < 0.01);
      if (costMatches.length === 1) {
        return { status: 'resolved', entity: costMatches[0] };
      }
      if (costMatches.length > 1) {
        return { status: 'ambiguous', candidates: costMatches };
      }
    }

    return { status: 'not_found' };
  },

  /**
   * Resolves a job hours record by UUID, work date, or task description.
   * @param {string} [identifier] - UUID, date ("2026-05-22"), or task description ("drywall")
   * @param {string} jobId - Job boundary
   * @param {string} tenantId - Tenant boundary
   * @returns {Promise<{ status: 'resolved'|'ambiguous'|'not_found', entity?: any, candidates?: any[] }>}
   */
  async resolveJobHour(identifier, jobId, tenantId) {
    if (!jobId || !tenantId) return { status: 'not_found' };

    // Verify job exists and belongs to tenant
    const { data: job, error: jobErr } = await supabase
      .from('jobs')
      .select('id')
      .eq('id', jobId)
      .eq('tenant_id', tenantId)
      .single();

    if (jobErr || !job) {
      return { status: 'not_found' };
    }

    // Fetch all hours for this job
    const { data: hoursList, error } = await supabase
      .from('job_hours')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });

    if (error || !hoursList || hoursList.length === 0) {
      return { status: 'not_found' };
    }

    // If no identifier provided, default to the most recent unbilled entry (or most recent entry)
    if (!identifier || !String(identifier).trim()) {
      const unbilled = hoursList.find(h => h.billing_status === 'unbilled');
      return { status: 'resolved', entity: unbilled || hoursList[0] };
    }

    const raw = String(identifier).trim();

    // 1. Direct UUID Match
    if (UUID_REGEX.test(raw)) {
      const match = hoursList.find(h => h.id.toLowerCase() === raw.toLowerCase());
      if (match) return { status: 'resolved', entity: match };
    }

    // 2. Exact Date Match (YYYY-MM-DD)
    const dateMatches = hoursList.filter(h => h.date === raw);
    if (dateMatches.length === 1) {
      return { status: 'resolved', entity: dateMatches[0] };
    }
    if (dateMatches.length > 1) {
      return { status: 'ambiguous', candidates: dateMatches };
    }

    // 3. Substring Task Description Match
    const lowerRaw = raw.toLowerCase();
    const descMatches = hoursList.filter(h => h.description?.toLowerCase().includes(lowerRaw));
    if (descMatches.length === 1) {
      return { status: 'resolved', entity: descMatches[0] };
    }
    if (descMatches.length > 1) {
      return { status: 'ambiguous', candidates: descMatches };
    }

    // 4. Hours Amount Match (e.g. "4 hours" or "4")
    const parsedHours = parseFloat(raw.replace(/[^\d.]/g, ''));
    if (!isNaN(parsedHours)) {
      const hoursAmountMatches = hoursList.filter(h => Math.abs(Number(h.hours) - parsedHours) < 0.01);
      if (hoursAmountMatches.length === 1) {
        return { status: 'resolved', entity: hoursAmountMatches[0] };
      }
      if (hoursAmountMatches.length > 1) {
        return { status: 'ambiguous', candidates: hoursAmountMatches };
      }
    }

    return { status: 'not_found' };
  }
};
