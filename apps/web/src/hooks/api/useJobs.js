import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';
import { useToast } from '../../contexts/ToastContext';
import { translateApiError } from '../../utils/errorTranslator';

export const JOB_QUERY_KEYS = {
  all: ['jobs'],
  list: (filters = {}) => ['jobs', filters],
  detail: (id) => ['job', id],
  materials: (jobId, showBilled) => ['materials', 'job', jobId, showBilled],
  hours: (jobId, showBilled) => ['hours', 'job', jobId, showBilled]
};

export const useJobs = (filters = {}) => {
  const queryParams = new URLSearchParams();
  if (filters.client_id) queryParams.set('client_id', filters.client_id);
  if (filters.property_id) queryParams.set('property_id', filters.property_id);
  if (filters.status) queryParams.set('status', filters.status);
  
  const queryString = queryParams.toString();
  const endpoint = queryString ? `/api/jobs?${queryString}` : '/api/jobs';

  return useQuery({
    queryKey: JOB_QUERY_KEYS.list(filters),
    queryFn: () => apiClient.get(endpoint)
  });
};

export const useJob = (id) => {
  return useQuery({
    queryKey: JOB_QUERY_KEYS.detail(id),
    queryFn: () => apiClient.get(`/api/jobs/${id}`),
    enabled: !!id
  });
};

export const useJobMaterials = (jobId, showBilled = false, enabled = true) => {
  return useQuery({
    queryKey: JOB_QUERY_KEYS.materials(jobId, showBilled),
    queryFn: () => {
      const statusList = showBilled ? 'unbilled,on_draft,billed' : 'unbilled';
      return apiClient.get(`/api/jobs/${jobId}/materials?billing_status=${statusList}`);
    },
    enabled: !!jobId && enabled
  });
};

export const useJobHours = (jobId, showBilled = false, enabled = true) => {
  return useQuery({
    queryKey: JOB_QUERY_KEYS.hours(jobId, showBilled),
    queryFn: () => {
      const statusList = showBilled ? 'unbilled,on_draft,billed' : 'unbilled';
      return apiClient.get(`/api/jobs/${jobId}/hours?billing_status=${statusList}`);
    },
    enabled: !!jobId && enabled
  });
};

export const useCreateJob = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: (formData) => apiClient.post('/api/jobs', formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: JOB_QUERY_KEYS.all });
      showSuccess('Job successfully created!');
    },
    onError: (err) => showError(translateApiError(err))
  });
};

export const useUpdateJob = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: ({ id, ...formData }) => apiClient.put(`/api/jobs/${id}`, formData),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: JOB_QUERY_KEYS.all });
      if (variables?.id) {
        queryClient.invalidateQueries({ queryKey: JOB_QUERY_KEYS.detail(variables.id) });
      }
      showSuccess('Job successfully updated!');
    },
    onError: (err) => showError(translateApiError(err))
  });
};

export const useUpdateJobStatus = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: ({ id, status }) => apiClient.patch(`/api/jobs/${id}/status`, { status }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: JOB_QUERY_KEYS.all });
      if (variables?.id) {
        queryClient.invalidateQueries({ queryKey: JOB_QUERY_KEYS.detail(variables.id) });
      }
      showSuccess('Job status updated!');
    },
    onError: (err) => showError(translateApiError(err))
  });
};
