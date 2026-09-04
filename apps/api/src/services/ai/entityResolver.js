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
  }
};
