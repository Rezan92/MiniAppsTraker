import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';
import { useToast } from '../../contexts/ToastContext';
import { translateApiError } from '../../utils/errorTranslator';
import { QUERY_KEYS } from '../../lib/queryKeys';

export const APPOINTMENT_QUERY_KEYS = QUERY_KEYS.appointments;

/**
 * Hook to retrieve date-bounded or entity-filtered appointments
 */
export const useAppointments = (filters = {}) => {
  const queryParams = new URLSearchParams();
  if (filters.startDate || filters.start) queryParams.set('startDate', filters.startDate || filters.start);
  if (filters.endDate || filters.end) queryParams.set('endDate', filters.endDate || filters.end);
  if (filters.jobId || filters.job_id) queryParams.set('jobId', filters.jobId || filters.job_id);
  if (filters.clientId || filters.client_id) queryParams.set('clientId', filters.clientId || filters.client_id);
  if (filters.status) queryParams.set('status', filters.status);

  const queryString = queryParams.toString();
  const endpoint = queryString ? `/api/appointments?${queryString}` : '/api/appointments';

  return useQuery({
    queryKey: APPOINTMENT_QUERY_KEYS.list(filters),
    queryFn: () => apiClient.get(endpoint),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};

/**
 * Hook to retrieve single appointment details with relational joins
 */
export const useAppointment = (id) => {
  return useQuery({
    queryKey: APPOINTMENT_QUERY_KEYS.detail(id),
    queryFn: () => apiClient.get(`/api/appointments/${id}`),
    enabled: !!id
  });
};

/**
 * Hook to create a new appointment
 */
export const useCreateAppointment = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: (formData) => apiClient.post('/api/appointments', formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPOINTMENT_QUERY_KEYS.all });
      showSuccess('Appointment scheduled successfully!');
    },
    onError: (err) => showError(translateApiError(err))
  });
};

/**
 * Hook to update an existing appointment (supports drag-and-drop reschedule)
 */
export const useUpdateAppointment = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: ({ id, ...patchData }) => apiClient.patch(`/api/appointments/${id}`, patchData),
    onMutate: async (updatedAppointment) => {
      // Cancel any outgoing refetches so they don't overwrite optimistic update
      await queryClient.cancelQueries({ queryKey: APPOINTMENT_QUERY_KEYS.all });

      // Snapshot previous cache state across all appointment queries
      const previousData = queryClient.getQueriesData({ queryKey: APPOINTMENT_QUERY_KEYS.all });

      // Optimistically update all appointment collections in cache
      queryClient.setQueriesData({ queryKey: APPOINTMENT_QUERY_KEYS.all }, (old) => {
        if (!old || !Array.isArray(old)) return old;
        return old.map((apt) =>
          String(apt.id) === String(updatedAppointment.id)
            ? { ...apt, ...updatedAppointment }
            : apt
        );
      });

      return { previousData };
    },
    onError: (err, _variables, context) => {
      // Rollback cache if mutation failed
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      showError(translateApiError(err));
    },
    onSuccess: () => {
      showSuccess('Appointment updated successfully!');
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: APPOINTMENT_QUERY_KEYS.all });
      if (variables?.id) {
        queryClient.invalidateQueries({ queryKey: APPOINTMENT_QUERY_KEYS.detail(variables.id) });
      }
    }
  });
};

/**
 * Hook to delete an appointment
 */
export const useDeleteAppointment = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: (id) => apiClient.delete(`/api/appointments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPOINTMENT_QUERY_KEYS.all });
      showSuccess('Appointment deleted successfully.');
    },
    onError: (err) => showError(translateApiError(err))
  });
};
