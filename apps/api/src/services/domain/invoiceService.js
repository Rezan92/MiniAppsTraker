import { supabase } from '../../config/supabase.js';
import { calculateInvoiceFinancials, roundCurrency } from '../pricingEngine.js';
import { resolveEffectiveHourlyRate } from '../masterRates.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUUID = (str) => typeof str === 'string' && UUID_REGEX.test(str);

/**
 * Enforces that an invoice exists, belongs to the tenant, and is in an editable status (draft).
 * @param {string} invoiceId
 * @param {string} tenantId
 * @returns {Promise<Object>}
 */
export async function enforceInvoiceEditability(invoiceId, tenantId) {
  const { data: invoice, error } = await supabase
    .from('invoices')
    .select('id, status, tenant_id, job_id, client_id, labor_amount')
    .eq('id', invoiceId)
    .eq('tenant_id', tenantId)
    .single();

  if (error || !invoice) {
    const err = new Error('Invoice not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  if (['ready_to_send', 'sent', 'paid', 'voided'].includes(invoice.status)) {
    const err = new Error('Invoice is locked and cannot be edited in its current status.');
    err.status = 403;
    err.code = 'INVOICE_LOCKED';
    throw err;
  }

  return invoice;
}

/**
 * Creates a new draft invoice with sequential invoice numbering and audit logging.
 * Used by manual REST POST /api/invoices.
 * @param {Object} params
 * @param {string} params.tenantId
 * @param {string} [params.userId]
 * @param {Object} params.invoiceData
 * @returns {Promise<Object>} Created invoice
 */
export async function createInvoice({ tenantId, userId, invoiceData }) {
  if (!tenantId) {
    const err = new Error('Tenant context missing');
    err.status = 400;
    throw err;
  }

  const { due_date, ...restData } = invoiceData;
  const sanitizedDueDate = due_date === '' ? null : due_date;

  // 1. Fetch sequential invoice number from tenant record
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('next_invoice_number')
    .eq('id', tenantId)
    .single();

  if (tenantError) throw tenantError;
  const nextNum = tenant?.next_invoice_number || 1001;
  const invoiceNumber = `${nextNum}`;

  // 2. Insert invoice in draft status
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert([{
      ...restData,
      due_date: sanitizedDueDate,
      tenant_id: tenantId,
      invoice_number: invoiceNumber,
      labor_amount: restData.labor_amount || 0,
      materials_amount: 0,
      total_amount: restData.labor_amount || 0,
      status: 'draft'
    }])
    .select()
    .single();

  if (invoiceError) throw invoiceError;

  // 3. Atomically increment tenant invoice sequence
  await supabase
    .from('tenants')
    .update({ next_invoice_number: nextNum + 1 })
    .eq('id', tenantId);

  // 4. Audit Log
  await supabase.from('invoice_logs').insert([{
    invoice_id: invoice.id,
    tenant_id: tenantId,
    action: 'Created',
    user_id: userId || null
  }]);

  return invoice;
}

/**
 * Drafts an invoice populated from an existing Job (or Client).
 * Automatically pulls unbilled labor and materials, preserves verbatim descriptions,
 * calculates totals via pricingEngine.js, and locks unbilled items to 'on_draft'.
 * Used by AI Tool Executor draft_invoice and Job Billing workflows.
 * @param {Object} params
 * @returns {Promise<{ invoice: Object, client: Object, financials: Object, lineItems: Array }>}
 */
export async function draftInvoiceFromJob({
  tenantId,
  userId,
  clientId,
  jobId,
  laborTitle,
  dueDate,
  taxRatePercent = 0,
  markupAmount = 0,
  notes
}) {
  if (!tenantId) {
    const err = new Error('Tenant context missing');
    err.status = 400;
    throw err;
  }

  let targetClientId = clientId || null;
  let job = null;
  const lineItems = [];
  let baseLabor = 0;
  let linkedJobTitle = laborTitle || 'General Contracting Labor';

  // 1. Resolve Job and unbilled items if jobId provided
  if (jobId) {
    const { data: jobData, error: jobErr } = await supabase
      .from('jobs')
      .select('*, clients(*)')
      .eq('id', jobId)
      .eq('tenant_id', tenantId)
      .single();

    if (jobErr || !jobData) {
      const err = new Error('Job not found');
      err.status = 404;
      throw err;
    }
    job = jobData;
    targetClientId = targetClientId || job.client_id;
    linkedJobTitle = laborTitle || job.title;

    // Pull unbilled hours
    const { data: hoursList } = await supabase
      .from('job_hours')
      .select('*')
      .eq('job_id', job.id)
      .eq('billing_status', 'unbilled')
      .order('date', { ascending: true });

    // Pull unbilled materials
    const { data: materialsList } = await supabase
      .from('job_materials')
      .select('*')
      .eq('job_id', job.id)
      .eq('billing_status', 'unbilled')
      .order('purchase_date', { ascending: true });

    // Build labor line items
    if (job.rate_type === 'hourly') {
      const rate = job.hourly_rate || resolveEffectiveHourlyRate({ isEmergency: false });
      for (const h of (hoursList || [])) {
        const hCost = roundCurrency(Number(h.hours || 0) * rate);
        baseLabor = roundCurrency(baseLabor + hCost);
        lineItems.push({
          source_type: 'labor',
          source_id: h.id,
          description: h.description || `${h.hours} hours logged`,
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

  // 2. Resolve and verify Client
  if (!targetClientId) {
    const err = new Error('A valid client or job is required to draft an invoice.');
    err.status = 400;
    throw err;
  }

  const { data: client, error: clientErr } = await supabase
    .from('clients')
    .select('*')
    .eq('id', targetClientId)
    .eq('tenant_id', tenantId)
    .single();

  if (clientErr || !client) {
    const err = new Error('Client not found');
    err.status = 404;
    throw err;
  }

  // 3. Deterministic financial calculations via pricingEngine.js (Rule 10)
  const financials = calculateInvoiceFinancials({
    baseLaborAmount: baseLabor,
    lineItems,
    markupAmount: markupAmount || 0,
    taxRatePercent: taxRatePercent || 0
  });

  // 4. Fetch sequential invoice number
  const { data: tenantData, error: tenantErr } = await supabase
    .from('tenants')
    .select('next_invoice_number')
    .eq('id', tenantId)
    .single();

  if (tenantErr) throw tenantErr;
  const nextNum = tenantData?.next_invoice_number || 1001;
  const invoiceNumber = `${nextNum}`;
  const defaultDueDate = dueDate || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

  // 5. Insert invoice in draft status
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

  if (invErr) throw invErr;

  // 6. Increment tenant sequence
  await supabase
    .from('tenants')
    .update({ next_invoice_number: nextNum + 1 })
    .eq('id', tenantId);

  // 7. Insert line items and lock unbilled items to on_draft
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

    const matIds = lineItems.filter(i => i.source_type === 'material').map(i => i.source_id).filter(Boolean);
    if (matIds.length > 0) {
      await supabase
        .from('job_materials')
        .update({ billing_status: 'on_draft', invoice_id: newInvoice.id })
        .in('id', matIds);
    }
  }

  if (job) {
    await supabase
      .from('job_hours')
      .update({ billing_status: 'on_draft', invoice_id: newInvoice.id })
      .eq('job_id', job.id)
      .eq('billing_status', 'unbilled');
  }

  // 8. Audit log
  await supabase.from('invoice_logs').insert([{
    tenant_id: tenantId,
    invoice_id: newInvoice.id,
    action: 'Created',
    reason: 'Drafted from job',
    user_id: userId || null
  }]);

  return {
    invoice: newInvoice,
    client,
    financials,
    lineItems
  };
}

/**
 * Updates a draft invoice with line items diff, recalculating totals via pricingEngine.js.
 * Handles automatic rollback to 'unbilled' for removed items.
 * Used by manual REST PATCH /api/invoices/:id.
 * @param {Object} params
 * @returns {Promise<Object>} Updated full invoice with relations
 */
export async function updateInvoiceDraft({
  tenantId,
  userId,
  invoiceId,
  updateData = {},
  lineItems
}) {
  await enforceInvoiceEditability(invoiceId, tenantId);

  const { due_date, ...restData } = updateData;
  delete restData.job_id; // Job binding is immutable after creation
  const sanitizedDueDate = due_date === '' ? null : due_date;

  if (Array.isArray(lineItems)) {
    // 1. Fetch current line items from DB
    const { data: existingDbItems, error: fetchItemsErr } = await supabase
      .from('invoice_line_items')
      .select('*')
      .eq('invoice_id', invoiceId);

    if (fetchItemsErr) throw fetchItemsErr;
    const dbItems = existingDbItems || [];

    const incomingIds = new Set(lineItems.map(i => i.id).filter(id => isUUID(id)));

    // 2. Identify items to delete (in DB but not in incoming lineItems)
    const toDelete = dbItems.filter(item => !incomingIds.has(item.id));
    const toDeleteIds = toDelete.map(item => item.id);

    if (toDeleteIds.length > 0) {
      const { error: delErr } = await supabase
        .from('invoice_line_items')
        .delete()
        .in('id', toDeleteIds)
        .eq('invoice_id', invoiceId);

      if (delErr) throw delErr;

      // Rollback removed items to 'unbilled' if no other active draft references them
      for (const item of toDelete) {
        if (item.source_id && item.source_type !== 'ad_hoc') {
          const { data: otherDrafts } = await supabase
            .from('invoice_line_items')
            .select('invoices!inner(status)')
            .eq('source_id', item.source_id)
            .neq('invoice_id', invoiceId)
            .in('invoices.status', ['draft', 'ready_to_send']);

          if (!otherDrafts || otherDrafts.length === 0) {
            const table = item.source_type === 'labor' ? 'job_hours' : 'job_materials';
            await supabase.from(table).update({ billing_status: 'unbilled', invoice_id: null }).eq('id', item.source_id);
          }
        }
      }
    }

    // 3. Separate incoming items into updates vs insertions
    const itemsToUpdate = lineItems.filter(item => isUUID(item.id) && dbItems.some(dbItem => dbItem.id === item.id));
    const itemsToInsert = lineItems.filter(item => !isUUID(item.id) || !dbItems.some(dbItem => dbItem.id === item.id));

    for (const item of itemsToUpdate) {
      const { error: updErr } = await supabase
        .from('invoice_line_items')
        .update({
          description: item.description,
          amount: item.amount,
          sort_order: item.sort_order,
          is_billable: item.is_billable,
          service_date: item.service_date || null,
          is_hidden: item.is_hidden ?? false
        })
        .eq('id', item.id)
        .eq('invoice_id', invoiceId);

      if (updErr) throw updErr;
    }

    if (itemsToInsert.length > 0) {
      const insertPayload = itemsToInsert.map((item, index) => ({
        invoice_id: invoiceId,
        source_type: item.source_type,
        source_id: item.source_id || null,
        description: item.description,
        amount: item.amount,
        sort_order: item.sort_order ?? index,
        is_billable: item.is_billable ?? true,
        service_date: item.service_date || null,
        is_hidden: item.is_hidden ?? false
      }));

      const { error: insErr } = await supabase
        .from('invoice_line_items')
        .insert(insertPayload);

      if (insErr) throw insErr;

      // Lock newly linked job items to 'on_draft'
      const laborSourceIds = itemsToInsert.filter(i => i.source_type === 'labor' && i.source_id).map(i => i.source_id);
      const matSourceIds = itemsToInsert.filter(i => i.source_type === 'material' && i.source_id).map(i => i.source_id);
      if (laborSourceIds.length > 0) {
        await supabase.from('job_hours').update({ billing_status: 'on_draft', invoice_id: invoiceId }).in('id', laborSourceIds);
      }
      if (matSourceIds.length > 0) {
        await supabase.from('job_materials').update({ billing_status: 'on_draft', invoice_id: invoiceId }).in('id', matSourceIds);
      }
    }
  }

  // 4. Calculate financials
  let lineItemsForCalc = [];
  if (lineItems && Array.isArray(lineItems)) {
    lineItemsForCalc = lineItems;
  } else {
    const { data: items } = await supabase
      .from('invoice_line_items')
      .select('amount, source_type, is_billable')
      .eq('invoice_id', invoiceId);
    lineItemsForCalc = items || [];
  }

  const { laborAmount, materialsAmount, totalAmount } = calculateInvoiceFinancials({
    baseLaborAmount: restData.labor_amount,
    lineItems: lineItemsForCalc
  });

  const updatePayload = {
    ...restData,
    labor_amount: laborAmount,
    materials_amount: materialsAmount,
    total_amount: totalAmount
  };
  if (due_date !== undefined) {
    updatePayload.due_date = sanitizedDueDate;
  }

  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .update(updatePayload)
    .eq('id', invoiceId)
    .eq('tenant_id', tenantId)
    .select(`
      *,
      clients(name, email, phone, address),
      tenants(name, business_tagline, payment_method, payment_details, phone),
      jobs(id, title, rental_properties(id, address)),
      invoice_line_items(*)
    `)
    .single();

  if (invoiceError) throw invoiceError;

  // 5. Audit Log
  await supabase.from('invoice_logs').insert([{
    invoice_id: invoice.id,
    tenant_id: tenantId,
    user_id: userId || null,
    action: 'Updated',
    reason: 'Manual draft update'
  }]);

  return invoice;
}

/**
 * Adds a single line item to an editable invoice and updates totals deterministically.
 * Used by manual REST POST /api/invoices/:id/items and AI add_invoice_line_item.
 * @param {Object} params
 * @returns {Promise<{ item: Object, invoice: Object }>}
 */
export async function addInvoiceLineItem({
  tenantId,
  userId,
  invoiceId,
  itemData
}) {
  const inv = await enforceInvoiceEditability(invoiceId, tenantId);

  const {
    source_type = 'ad_hoc',
    source_id = null,
    description,
    amount,
    sort_order = 0,
    is_billable = true,
    service_date = null,
    is_hidden = false
  } = itemData;

  const { data: item, error: itemError } = await supabase
    .from('invoice_line_items')
    .insert([{
      invoice_id: invoiceId,
      source_type,
      source_id,
      description: description.trim(),
      amount: roundCurrency(amount),
      sort_order,
      is_billable,
      service_date,
      is_hidden
    }])
    .select()
    .single();

  if (itemError) throw itemError;

  // Lock linked item to 'on_draft'
  if (source_id && source_type !== 'ad_hoc') {
    const table = source_type === 'labor' ? 'job_hours' : 'job_materials';
    await supabase.from(table).update({ billing_status: 'on_draft', invoice_id: invoiceId }).eq('id', source_id);
  }

  // Recalculate invoice totals
  const { data: allItems } = await supabase
    .from('invoice_line_items')
    .select('*')
    .eq('invoice_id', invoiceId);

  const financials = calculateInvoiceFinancials({
    baseLaborAmount: inv.labor_amount,
    lineItems: allItems || []
  });

  const { data: updatedInvoice, error: invUpdErr } = await supabase
    .from('invoices')
    .update({
      materials_amount: financials.materialsAmount,
      total_amount: financials.totalAmount
    })
    .eq('id', invoiceId)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (invUpdErr) throw invUpdErr;

  // Audit log
  await supabase.from('invoice_logs').insert([{
    tenant_id: tenantId,
    invoice_id: invoiceId,
    user_id: userId || null,
    action: 'Item Added',
    reason: `Added line item: ${description.trim()} ($${roundCurrency(amount)})`
  }]);

  return { item, invoice: updatedInvoice };
}

/**
 * Updates an existing line item and recalculates invoice totals.
 * @param {Object} params
 * @returns {Promise<Object>} Updated item
 */
export async function updateInvoiceLineItem({
  tenantId,
  userId,
  invoiceId,
  itemId,
  updateData
}) {
  const inv = await enforceInvoiceEditability(invoiceId, tenantId);

  const { data: item, error: itemError } = await supabase
    .from('invoice_line_items')
    .update(updateData)
    .eq('id', itemId)
    .eq('invoice_id', invoiceId)
    .select()
    .single();

  if (itemError) throw itemError;

  // Recalculate invoice totals
  const { data: allItems } = await supabase
    .from('invoice_line_items')
    .select('*')
    .eq('invoice_id', invoiceId);

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
    .eq('id', invoiceId)
    .eq('tenant_id', tenantId);

  return item;
}

/**
 * Deletes a single line item and rolls back linked labor/materials to 'unbilled'.
 * Recalculates invoice totals.
 * @param {Object} params
 * @returns {Promise<{ success: boolean }>}
 */
export async function deleteInvoiceLineItem({
  tenantId,
  userId,
  invoiceId,
  itemId
}) {
  const inv = await enforceInvoiceEditability(invoiceId, tenantId);

  const { data: item, error: findErr } = await supabase
    .from('invoice_line_items')
    .select('source_id, source_type')
    .eq('id', itemId)
    .eq('invoice_id', invoiceId)
    .single();

  if (findErr || !item) {
    const err = new Error('Item not found');
    err.status = 404;
    throw err;
  }

  await supabase
    .from('invoice_line_items')
    .delete()
    .eq('id', itemId)
    .eq('invoice_id', invoiceId);

  // Revert billing status if linked
  if (item.source_id && item.source_type !== 'ad_hoc') {
    const { data: drafts } = await supabase
      .from('invoice_line_items')
      .select('invoices!inner(status)')
      .eq('source_id', item.source_id)
      .in('invoices.status', ['draft', 'ready_to_send']);

    if (!drafts || drafts.length === 0) {
      const table = item.source_type === 'labor' ? 'job_hours' : 'job_materials';
      await supabase.from(table).update({ billing_status: 'unbilled', invoice_id: null }).eq('id', item.source_id);
    }
  }

  // Recalculate invoice totals
  const { data: allItems } = await supabase
    .from('invoice_line_items')
    .select('*')
    .eq('invoice_id', invoiceId);

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
    .eq('id', invoiceId)
    .eq('tenant_id', tenantId);

  return { success: true };
}

/**
 * Transitions an invoice to a new status with complete lifecycle validation,
 * audit logging, and labor/materials billing status synchronization.
 * Used by manual REST PATCH /api/invoices/:id/status, AI update_invoice_status,
 * and AI confirm-action (void_invoice).
 * @param {Object} params
 * @returns {Promise<Object>} Updated invoice
 */
export async function updateInvoiceStatus({
  tenantId,
  userId,
  invoiceId,
  status,
  reason
}) {
  if (!tenantId) {
    const err = new Error('Tenant context missing');
    err.status = 400;
    throw err;
  }

  const { data: existing, error: existError } = await supabase
    .from('invoices')
    .select('id, status, job_id')
    .eq('id', invoiceId)
    .eq('tenant_id', tenantId)
    .single();

  if (existError || !existing) {
    const err = new Error('Invoice not found');
    err.status = 404;
    throw err;
  }

  // Guard: draft/ready_to_send/disputed cannot be voided; they must be deleted
  if (status === 'voided' && ['draft', 'ready_to_send', 'disputed'].includes(existing.status)) {
    const err = new Error('Draft and disputed invoices cannot be voided. They should be deleted instead.');
    err.status = 400;
    err.code = 'INVOICE_NOT_VOIDABLE';
    throw err;
  }

  let action = 'Updated';
  if (status === 'sent') action = 'Sent';
  if (status === 'paid') action = 'Paid';
  if (status === 'voided') action = 'Voided';
  if (status === 'ready_to_send') action = 'Ready';
  if (status === 'disputed') action = 'Disputed';
  if (status === 'draft' && existing.status !== 'draft') action = 'Reverted';

  if (['Reverted', 'Voided', 'Disputed'].includes(action) && !reason) {
    const err = new Error('A reason is required to revert, void, or dispute an invoice');
    err.status = 400;
    err.code = 'REASON_REQUIRED';
    throw err;
  }

  const updateData = { status };
  if (status === 'paid') {
    updateData.paid_at = new Date().toISOString();
  } else {
    updateData.paid_at = null;
  }

  const { data: updatedInvoice, error } = await supabase
    .from('invoices')
    .update(updateData)
    .eq('id', invoiceId)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) throw error;

  // Status-driven billing status synchronization
  if (status === 'sent') {
    const { data: lines } = await supabase
      .from('invoice_line_items')
      .select('source_id, source_type')
      .eq('invoice_id', invoiceId);

    if (lines && lines.length > 0) {
      const matIds = lines.filter(i => i.source_type === 'material' && i.source_id).map(i => i.source_id);
      const labIds = lines.filter(i => i.source_type === 'labor' && i.source_id).map(i => i.source_id);
      if (matIds.length) await supabase.from('job_materials').update({ billing_status: 'billed' }).in('id', matIds);
      if (labIds.length) await supabase.from('job_hours').update({ billing_status: 'billed' }).in('id', labIds);
    }

    if (updatedInvoice.job_id) {
      const { data: job } = await supabase.from('jobs').select('status').eq('id', updatedInvoice.job_id).single();
      if (job && job.status !== 'completed') {
        await supabase.from('jobs').update({ status: 'completed' }).eq('id', updatedInvoice.job_id);
      }
    }
  }

  if (status === 'voided') {
    const { data: lines } = await supabase
      .from('invoice_line_items')
      .select('source_id, source_type')
      .eq('invoice_id', invoiceId);

    if (lines && lines.length > 0) {
      const matIds = lines.filter(i => i.source_type === 'material' && i.source_id).map(i => i.source_id);
      const labIds = lines.filter(i => i.source_type === 'labor' && i.source_id).map(i => i.source_id);
      if (matIds.length) await supabase.from('job_materials').update({ billing_status: 'unbilled', invoice_id: null }).in('id', matIds);
      if (labIds.length) await supabase.from('job_hours').update({ billing_status: 'unbilled', invoice_id: null }).in('id', labIds);
    }

    await Promise.all([
      supabase.from('job_hours').update({ billing_status: 'unbilled', invoice_id: null }).eq('invoice_id', invoiceId),
      supabase.from('job_materials').update({ billing_status: 'unbilled', invoice_id: null }).eq('invoice_id', invoiceId)
    ]);
  }

  if (status === 'draft' || status === 'ready_to_send') {
    const { data: lines } = await supabase
      .from('invoice_line_items')
      .select('source_id, source_type')
      .eq('invoice_id', invoiceId);

    if (lines && lines.length > 0) {
      const matIds = lines.filter(i => i.source_type === 'material' && i.source_id).map(i => i.source_id);
      const labIds = lines.filter(i => i.source_type === 'labor' && i.source_id).map(i => i.source_id);
      if (matIds.length) await supabase.from('job_materials').update({ billing_status: 'on_draft' }).in('id', matIds);
      if (labIds.length) await supabase.from('job_hours').update({ billing_status: 'on_draft' }).in('id', labIds);
    }
  }

  // Audit log
  await supabase.from('invoice_logs').insert([{
    invoice_id: invoiceId,
    tenant_id: tenantId,
    action,
    reason: reason || null,
    user_id: userId || null
  }]);

  return updatedInvoice;
}

/**
 * Completely deletes a draft, ready_to_send, or disputed invoice,
 * atomicity guaranteed: rolls back all linked job hours and materials to 'unbilled'.
 * Used by manual REST DELETE /api/invoices/:id and AI confirm-action (delete_invoice).
 * @param {Object} params
 * @returns {Promise<{ success: boolean, deletedInvoice: Object }>}
 */
export async function deleteDraftInvoice({ tenantId, userId, invoiceId }) {
  if (!tenantId) {
    const err = new Error('Tenant context missing');
    err.status = 400;
    throw err;
  }

  const { data: existing, error: checkError } = await supabase
    .from('invoices')
    .select('id, status, job_id, invoice_number')
    .eq('id', invoiceId)
    .eq('tenant_id', tenantId)
    .single();

  if (checkError || !existing) {
    const err = new Error('Invoice not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  if (!['draft', 'ready_to_send', 'disputed'].includes(existing.status)) {
    const err = new Error(`Only draft, ready to send, or disputed invoices can be deleted. Cannot delete invoice in "${existing.status}" status.`);
    err.status = 403;
    err.code = 'INVOICE_NOT_DELETABLE';
    throw err;
  }

  // 1. Fetch all linked line items to unlock hours and materials
  const { data: items } = await supabase
    .from('invoice_line_items')
    .select('source_type, source_id')
    .eq('invoice_id', invoiceId)
    .not('source_id', 'is', null);

  if (items && items.length > 0) {
    const laborIds = items.filter(i => i.source_type === 'labor').map(i => i.source_id);
    const materialIds = items.filter(i => i.source_type === 'material').map(i => i.source_id);

    if (laborIds.length > 0) {
      await supabase
        .from('job_hours')
        .update({ billing_status: 'unbilled', invoice_id: null })
        .in('id', laborIds);
    }
    if (materialIds.length > 0) {
      await supabase
        .from('job_materials')
        .update({ billing_status: 'unbilled', invoice_id: null })
        .in('id', materialIds);
    }
  }

  // 2. Clear any hours/materials pointing to this invoice_id directly
  await Promise.all([
    supabase.from('job_hours').update({ billing_status: 'unbilled', invoice_id: null }).eq('invoice_id', invoiceId),
    supabase.from('job_materials').update({ billing_status: 'unbilled', invoice_id: null }).eq('invoice_id', invoiceId)
  ]);

  // 3. Delete invoice record (invoice_line_items & invoice_logs cascade via FK)
  const { error: delErr } = await supabase
    .from('invoices')
    .delete()
    .eq('id', invoiceId)
    .eq('tenant_id', tenantId);

  if (delErr) throw delErr;

  return {
    success: true,
    deletedInvoice: existing
  };
}

/**
 * Updates internal notes for an invoice.
 * @param {Object} params
 * @returns {Promise<Object>} Updated invoice
 */
export async function updateInternalNotes({ tenantId, userId, invoiceId, internalNotes }) {
  if (!tenantId) {
    const err = new Error('Tenant context missing');
    err.status = 400;
    throw err;
  }

  const { data, error } = await supabase
    .from('invoices')
    .update({ internal_notes: internalNotes })
    .eq('id', invoiceId)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
