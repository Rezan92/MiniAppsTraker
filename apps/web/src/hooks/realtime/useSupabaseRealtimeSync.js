import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import {
  invalidateInvoiceCascade,
  invalidateJobCascade,
  invalidateJobWorkItemsCascade,
  invalidateClientCascade,
  invalidatePropertyCascade
} from '../../lib/cacheInvalidator';

/**
 * useSupabaseRealtimeSync Hook
 * Subscribes to Supabase Realtime broadcast channels for the current tenant.
 * When Postgres mutations (INSERT, UPDATE, DELETE) occur on core tables,
 * dispatches relational cascading cache invalidations to update TanStack Query cache in real-time.
 */
export const useSupabaseRealtimeSync = (activeTenantId) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!activeTenantId || !supabase) return;

    const channelName = `tenant-sync-${activeTenantId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' },
        (payload) => {
          const { table, new: newRow, old: oldRow } = payload;
          const targetRow = newRow || oldRow || {};

          // Multi-tenant barrier: if tenant_id exists on row, ignore other tenants
          if (targetRow.tenant_id && targetRow.tenant_id !== activeTenantId) {
            return;
          }

          switch (table) {
            case 'clients': {
              const clientId = newRow?.id || oldRow?.id;
              invalidateClientCascade(queryClient, { clientId });
              break;
            }

            case 'rental_properties': {
              const propertyId = newRow?.id || oldRow?.id;
              const clientId = newRow?.client_id || oldRow?.client_id;
              invalidatePropertyCascade(queryClient, { propertyId, clientId });
              break;
            }

            case 'jobs': {
              const jobId = newRow?.id || oldRow?.id;
              const clientId = newRow?.client_id || oldRow?.client_id;
              const propertyId = newRow?.property_id || oldRow?.property_id;
              invalidateJobCascade(queryClient, { jobId, clientId, propertyId });
              break;
            }

            case 'job_hours':
            case 'job_materials': {
              const jobId = newRow?.job_id || oldRow?.job_id;
              invalidateJobWorkItemsCascade(queryClient, { jobId });
              break;
            }

            case 'invoices': {
              const invoiceId = newRow?.id || oldRow?.id;
              const jobId = newRow?.job_id || oldRow?.job_id;
              const clientId = newRow?.client_id || oldRow?.client_id;
              invalidateInvoiceCascade(queryClient, { invoiceId, jobId, clientId });
              break;
            }

            case 'invoice_line_items': {
              const invoiceId = newRow?.invoice_id || oldRow?.invoice_id;
              invalidateInvoiceCascade(queryClient, { invoiceId });
              break;
            }

            default:
              break;
          }
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.warn(`[Supabase Realtime] Sync subscription error for channel ${channelName}:`, err);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTenantId, queryClient]);
};
