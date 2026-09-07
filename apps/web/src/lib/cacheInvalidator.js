import { QUERY_KEYS } from './queryKeys';

/**
 * Relational Cascade Cache Invalidation Service for TanStack Query v5.
 * Ensures that whenever an entity is created, updated, or deleted,
 * all dependent queries (details, lists, parent relations, work items, and dashboard metrics)
 * are invalidated synchronously and deterministically.
 */

export const invalidateInvoiceCascade = (queryClient, { invoiceId, jobId, clientId } = {}) => {
  if (!queryClient) return;

  // Invalidate all invoice lists
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.invoices.all });

  // Invalidate specific invoice detail and audit logs if present
  if (invoiceId) {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.invoices.detail(invoiceId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.invoices.logs(invoiceId) });
    // Legacy query key safety fallbacks
    queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
    queryClient.invalidateQueries({ queryKey: ['invoice_logs', invoiceId] });
    queryClient.invalidateQueries({ queryKey: ['invoice-logs', invoiceId] });
  }

  // Invalidate connected job and its unbilled/billed work items
  if (jobId) {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.jobs.detail(jobId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.jobs.allHours(jobId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.jobs.allMaterials(jobId) });
    queryClient.invalidateQueries({ queryKey: ['job', jobId] });
    queryClient.invalidateQueries({ queryKey: ['jobs', jobId] });
    queryClient.invalidateQueries({ queryKey: ['hours', 'job', jobId] });
    queryClient.invalidateQueries({ queryKey: ['materials', 'job', jobId] });
    queryClient.invalidateQueries({ queryKey: ['job_hours', jobId] });
    queryClient.invalidateQueries({ queryKey: ['job_materials', jobId] });
  }

  // Broad invalidation of job lists, work items, and dashboard rollups
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.jobs.all });
  queryClient.invalidateQueries({ queryKey: ['hours'] });
  queryClient.invalidateQueries({ queryKey: ['materials'] });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboard.all });

  if (clientId) {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.clients.detail(clientId) });
    queryClient.invalidateQueries({ queryKey: ['clients', clientId] });
    queryClient.invalidateQueries({ queryKey: ['client', clientId] });
  }
};

export const invalidateJobCascade = (queryClient, { jobId, clientId, propertyId } = {}) => {
  if (!queryClient) return;

  // Invalidate jobs list
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.jobs.all });

  if (jobId) {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.jobs.detail(jobId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.jobs.allHours(jobId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.jobs.allMaterials(jobId) });
    // Legacy fallbacks
    queryClient.invalidateQueries({ queryKey: ['job', jobId] });
    queryClient.invalidateQueries({ queryKey: ['jobs', jobId] });
    queryClient.invalidateQueries({ queryKey: ['hours', 'job', jobId] });
    queryClient.invalidateQueries({ queryKey: ['materials', 'job', jobId] });
    queryClient.invalidateQueries({ queryKey: ['job_hours', jobId] });
    queryClient.invalidateQueries({ queryKey: ['job_materials', jobId] });
  }

  if (clientId) {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.jobs.listByClient(clientId) });
    queryClient.invalidateQueries({ queryKey: ['jobs', 'client', clientId] });
  }

  if (propertyId) {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.jobs.listByProperty(propertyId) });
    queryClient.invalidateQueries({ queryKey: ['jobs', 'property', propertyId] });
  }

  // Invalidate invoices since jobs impact billing totals
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.invoices.all });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboard.all });
};

export const invalidateJobWorkItemsCascade = (queryClient, { jobId } = {}) => {
  if (!queryClient) return;

  if (jobId) {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.jobs.detail(jobId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.jobs.allHours(jobId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.jobs.allMaterials(jobId) });
    // Legacy fallbacks
    queryClient.invalidateQueries({ queryKey: ['job', jobId] });
    queryClient.invalidateQueries({ queryKey: ['jobs', jobId] });
    queryClient.invalidateQueries({ queryKey: ['hours', 'job', jobId] });
    queryClient.invalidateQueries({ queryKey: ['materials', 'job', jobId] });
    queryClient.invalidateQueries({ queryKey: ['job_hours', jobId] });
    queryClient.invalidateQueries({ queryKey: ['job_materials', jobId] });
  }

  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.jobs.all });
  queryClient.invalidateQueries({ queryKey: ['hours'] });
  queryClient.invalidateQueries({ queryKey: ['materials'] });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.invoices.all });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboard.all });
};

export const invalidateClientCascade = (queryClient, { clientId } = {}) => {
  if (!queryClient) return;

  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.clients.all });

  if (clientId) {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.clients.detail(clientId) });
    queryClient.invalidateQueries({ queryKey: ['clients', clientId] });
    queryClient.invalidateQueries({ queryKey: ['client', clientId] });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.properties.listByClient(clientId) });
    queryClient.invalidateQueries({ queryKey: ['properties', clientId] });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.jobs.listByClient(clientId) });
  }

  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboard.all });
};

export const invalidatePropertyCascade = (queryClient, { propertyId, clientId } = {}) => {
  if (!queryClient) return;

  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.properties.all });

  if (propertyId) {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.properties.detail(propertyId) });
    queryClient.invalidateQueries({ queryKey: ['property', propertyId] });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.jobs.listByProperty(propertyId) });
    queryClient.invalidateQueries({ queryKey: ['jobs', 'property', propertyId] });
  }

  if (clientId) {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.properties.listByClient(clientId) });
    queryClient.invalidateQueries({ queryKey: ['properties', clientId] });
  }

  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.jobs.all });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboard.all });
};
