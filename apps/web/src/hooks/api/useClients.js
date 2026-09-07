import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';
import { useToast } from '../../contexts/ToastContext';
import { translateApiError } from '../../utils/errorTranslator';
import { QUERY_KEYS } from '../../lib/queryKeys';
import { invalidateClientCascade } from '../../lib/cacheInvalidator';

export const CLIENT_QUERY_KEYS = QUERY_KEYS.clients;

export const useClients = (search = '') => {
  return useQuery({
    queryKey: CLIENT_QUERY_KEYS.list(search),
    queryFn: () => apiClient.get(search ? `/api/clients?search=${encodeURIComponent(search)}` : '/api/clients'),
    placeholderData: keepPreviousData
  });
};

export const useClient = (id) => {
  return useQuery({
    queryKey: CLIENT_QUERY_KEYS.detail(id),
    queryFn: () => apiClient.get(`/api/clients/${id}`),
    enabled: !!id
  });
};

export const useCreateClient = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: (formData) => apiClient.post('/api/clients', formData),
    onSuccess: (data) => {
      invalidateClientCascade(queryClient, { clientId: data?.id });
      showSuccess('Client successfully added!');
    },
    onError: (err) => showError(translateApiError(err))
  });
};

export const useUpdateClient = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: ({ id, ...formData }) => apiClient.put(`/api/clients/${id}`, formData),
    onSuccess: (_data, variables) => {
      invalidateClientCascade(queryClient, { clientId: variables?.id });
      showSuccess('Client updated successfully!');
    },
    onError: (err) => showError(translateApiError(err))
  });
};

export const useDeleteClient = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: (id) => apiClient.delete(`/api/clients/${id}`),
    onSuccess: (_data, id) => {
      invalidateClientCascade(queryClient, { clientId: id });
      showSuccess('Client deleted successfully!');
    },
    onError: (err) => showError(translateApiError(err))
  });
};
