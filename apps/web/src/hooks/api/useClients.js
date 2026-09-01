import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';
import { useToast } from '../../contexts/ToastContext';
import { translateApiError } from '../../utils/errorTranslator';

export const CLIENT_QUERY_KEYS = {
  all: ['clients'],
  list: (search) => ['clients', { search }],
  detail: (id) => ['clients', 'detail', id]
};

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLIENT_QUERY_KEYS.all });
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
      queryClient.invalidateQueries({ queryKey: CLIENT_QUERY_KEYS.all });
      if (variables?.id) {
        queryClient.invalidateQueries({ queryKey: CLIENT_QUERY_KEYS.detail(variables.id) });
      }
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLIENT_QUERY_KEYS.all });
      showSuccess('Client deleted successfully!');
    },
    onError: (err) => showError(translateApiError(err))
  });
};
