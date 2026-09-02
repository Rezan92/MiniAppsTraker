import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';

export const DASHBOARD_QUERY_KEYS = {
  all: ['dashboard'],
  summary: (tenantId) => ['dashboard', 'summary', tenantId]
};

export const useDashboardSummary = (tenantId) => {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.summary(tenantId),
    queryFn: () => apiClient.get('/api/dashboard/summary'),
    enabled: !!tenantId
  });
};
