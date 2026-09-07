import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';
import { QUERY_KEYS } from '../../lib/queryKeys';

export const DASHBOARD_QUERY_KEYS = QUERY_KEYS.dashboard;

export const useDashboardSummary = (tenantId) => {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.summary(tenantId),
    queryFn: () => apiClient.get('/api/dashboard/summary'),
    enabled: !!tenantId
  });
};
