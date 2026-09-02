import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';
import { useToast } from '../../contexts/ToastContext';
import { translateApiError } from '../../utils/errorTranslator';

export const TEAM_QUERY_KEYS = {
  members: (tenantId) => ['team', 'members', tenantId],
  invitations: (tenantId) => ['team', 'invitations', tenantId]
};

export const useTeamMembers = (tenantId) => {
  return useQuery({
    queryKey: TEAM_QUERY_KEYS.members(tenantId),
    queryFn: () => apiClient.get(`/api/auth/workspaces/${tenantId}/members`),
    enabled: !!tenantId
  });
};

export const usePendingInvitations = (tenantId) => {
  return useQuery({
    queryKey: TEAM_QUERY_KEYS.invitations(tenantId),
    queryFn: () => apiClient.get('/api/invitations'),
    enabled: !!tenantId
  });
};

export const useSendInvitation = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: (data) => apiClient.post('/api/invitations', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', 'invitations'] });
      showSuccess('Invitation sent successfully!');
    },
    onError: (err) => showError(translateApiError(err))
  });
};

export const useRevokeInvitation = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: (id) => apiClient.delete(`/api/invitations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', 'invitations'] });
      showSuccess('Invitation revoked');
    },
    onError: (err) => showError(translateApiError(err))
  });
};

export const useUpdateMemberRole = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: ({ tenantId, userId, role }) => apiClient.patch(`/api/auth/workspaces/${tenantId}/members/${userId}`, { role }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEYS.members(variables.tenantId) });
      showSuccess('Member role updated successfully!');
    },
    onError: (err) => showError(translateApiError(err))
  });
};

export const useRemoveMember = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: ({ tenantId, userId }) => apiClient.delete(`/api/auth/workspaces/${tenantId}/members/${userId}`),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEYS.members(variables.tenantId) });
      showSuccess('Member removed from workspace');
    },
    onError: (err) => showError(translateApiError(err))
  });
};
