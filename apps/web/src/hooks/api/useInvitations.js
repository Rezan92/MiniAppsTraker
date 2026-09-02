import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';
import { useToast } from '../../contexts/ToastContext';
import { translateApiError } from '../../utils/errorTranslator';

export const INVITATION_QUERY_KEYS = {
  detail: (token) => ['invitations', token]
};

export const useInvitation = (token) => {
  return useQuery({
    queryKey: INVITATION_QUERY_KEYS.detail(token),
    queryFn: () => apiClient.get(`/api/invitations/${token}`),
    enabled: !!token,
    retry: false
  });
};

export const useAcceptInvitation = () => {
  const { showError } = useToast();

  return useMutation({
    mutationFn: (token) => apiClient.post(`/api/invitations/${token}/accept`),
    onError: (err) => showError(translateApiError(err))
  });
};
