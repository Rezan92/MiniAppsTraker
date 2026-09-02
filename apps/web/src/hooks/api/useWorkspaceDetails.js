import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';
import { useToast } from '../../contexts/ToastContext';
import { translateApiError } from '../../utils/errorTranslator';

export const WORKSPACE_QUERY_KEYS = {
  all: ['workspaces'],
  detail: (id) => ['workspaces', 'detail', id]
};

export const useWorkspaceDetails = (tenantId) => {
  return useQuery({
    queryKey: WORKSPACE_QUERY_KEYS.detail(tenantId),
    queryFn: () => apiClient.get(`/api/auth/workspaces/${tenantId}`),
    enabled: !!tenantId
  });
};

export const useUpdateWorkspaceDetails = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: ({ tenantId, ...formData }) => apiClient.patch(`/api/auth/workspaces/${tenantId}`, formData),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: WORKSPACE_QUERY_KEYS.all });
      if (variables?.tenantId) {
        queryClient.invalidateQueries({ queryKey: WORKSPACE_QUERY_KEYS.detail(variables.tenantId) });
      }
      showSuccess('Company profile updated successfully!');
    },
    onError: (err) => showError(translateApiError(err))
  });
};
