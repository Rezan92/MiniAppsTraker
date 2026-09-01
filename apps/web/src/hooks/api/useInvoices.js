import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';
import { useToast } from '../../contexts/ToastContext';
import { translateApiError } from '../../utils/errorTranslator';

export const INVOICE_QUERY_KEYS = {
  all: ['invoices'],
  list: (filters = {}) => ['invoices', filters],
  detail: (id) => ['invoice', id],
  logs: (id) => ['invoice_logs', id]
};

export const useInvoices = (filters = {}) => {
  const queryParams = new URLSearchParams();
  if (filters.status) queryParams.set('status', filters.status);
  if (filters.client_id) queryParams.set('client_id', filters.client_id);
  if (filters.property_id) queryParams.set('property_id', filters.property_id);
  if (filters.job_id) queryParams.set('job_id', filters.job_id);
  if (filters.from_date) queryParams.set('from_date', filters.from_date);
  if (filters.to_date) queryParams.set('to_date', filters.to_date);

  const queryString = queryParams.toString();
  const endpoint = queryString ? `/api/invoices?${queryString}` : '/api/invoices';

  return useQuery({
    queryKey: INVOICE_QUERY_KEYS.list(filters),
    queryFn: () => apiClient.get(endpoint)
  });
};

export const useInvoice = (id) => {
  return useQuery({
    queryKey: INVOICE_QUERY_KEYS.detail(id),
    queryFn: () => apiClient.get(`/api/invoices/${id}`),
    enabled: !!id
  });
};

export const useInvoiceLogs = (id) => {
  return useQuery({
    queryKey: INVOICE_QUERY_KEYS.logs(id),
    queryFn: () => apiClient.get(`/api/invoices/${id}/logs`),
    enabled: !!id
  });
};

export const useSaveInvoice = (id) => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  const isEditing = !!id;

  return useMutation({
    mutationFn: (payload) => {
      const endpoint = isEditing ? `/api/invoices/${id}` : '/api/invoices';
      return isEditing ? apiClient.patch(endpoint, payload) : apiClient.post(endpoint, payload);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: INVOICE_QUERY_KEYS.all });
      if (id) {
        queryClient.invalidateQueries({ queryKey: INVOICE_QUERY_KEYS.detail(id) });
        queryClient.invalidateQueries({ queryKey: INVOICE_QUERY_KEYS.logs(id) });
      }
      showSuccess(`Invoice ${isEditing ? 'updated' : 'created'} successfully`);
    },
    onError: (err) => showError(translateApiError(err))
  });
};

export const useUpdateInvoiceStatus = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: ({ id, status, reason }) => apiClient.patch(`/api/invoices/${id}/status`, { status, reason }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: INVOICE_QUERY_KEYS.all });
      if (variables?.id) {
        queryClient.invalidateQueries({ queryKey: INVOICE_QUERY_KEYS.detail(variables.id) });
        queryClient.invalidateQueries({ queryKey: INVOICE_QUERY_KEYS.logs(variables.id) });
      }
      showSuccess('Status updated successfully');
    },
    onError: (err) => showError(translateApiError(err))
  });
};

export const useUpdateInvoiceInternalNotes = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: ({ id, notes }) => apiClient.patch(`/api/invoices/${id}/internal-notes`, { internal_notes: notes }),
    onSuccess: (_data, variables) => {
      if (variables?.id) {
        queryClient.invalidateQueries({ queryKey: INVOICE_QUERY_KEYS.detail(variables.id) });
      }
      showSuccess('Internal notes updated');
    },
    onError: (err) => showError(translateApiError(err))
  });
};

export const useDeleteInvoice = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: (id) => apiClient.delete(`/api/invoices/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVOICE_QUERY_KEYS.all });
      showSuccess('Invoice deleted successfully');
    },
    onError: (err) => showError(translateApiError(err))
  });
};
