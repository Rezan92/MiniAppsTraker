import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';

export const PROPERTY_QUERY_KEYS = {
  all: ['properties'],
  listByClient: (clientId) => ['properties', clientId],
  detail: (id) => ['property', id]
};

export const useProperties = (clientId) => {
  return useQuery({
    queryKey: PROPERTY_QUERY_KEYS.listByClient(clientId),
    queryFn: () => apiClient.get(clientId ? `/api/properties?client_id=${clientId}` : '/api/properties'),
    enabled: !!clientId
  });
};

export const useProperty = (id) => {
  return useQuery({
    queryKey: PROPERTY_QUERY_KEYS.detail(id),
    queryFn: () => apiClient.get(`/api/properties/${id}`),
    enabled: !!id
  });
};
