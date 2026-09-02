import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { FormField } from '../common/FormField';
import { DeleteWorkspaceModal } from './DeleteWorkspaceModal';
import { companyProfileSchema } from '../../schemas/companyProfileSchema';
import { useWorkspaceDetails, useUpdateWorkspaceDetails } from '../../hooks/api/useWorkspaceDetails';

export const CompanyProfile = () => {
  const { userData, refreshUserData } = useAuth();
  const { showSuccess } = useToast();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const isAdmin = userData?.role === 'admin';
  const tenantId = userData?.tenant_id;

  const { data: workspace, isLoading } = useWorkspaceDetails(tenantId);
  const updateMutation = useUpdateWorkspaceDetails();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty }
  } = useForm({
    resolver: zodResolver(companyProfileSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      phone: '',
      address: '',
      timezone: 'UTC',
      business_tagline: '',
      payment_method: '',
      payment_details: ''
    }
  });

  useEffect(() => {
    if (workspace) {
      reset({
        name: workspace.name || '',
        phone: workspace.phone || '',
        address: workspace.address || '',
        timezone: workspace.timezone || 'UTC',
        business_tagline: workspace.business_tagline || '',
        payment_method: workspace.payment_method || '',
        payment_details: workspace.payment_details || ''
      });
    }
  }, [workspace, reset]);

  const onSubmit = async (data) => {
    if (!isAdmin || !tenantId) return;
    updateMutation.mutate(
      { tenantId, ...data },
      {
        onSuccess: async () => {
          await refreshUserData();
        }
      }
    );
  };

  const handleCancel = () => {
    if (workspace) {
      reset({
        name: workspace.name || '',
        phone: workspace.phone || '',
        address: workspace.address || '',
        timezone: workspace.timezone || 'UTC',
        business_tagline: workspace.business_tagline || '',
        payment_method: workspace.payment_method || '',
        payment_details: workspace.payment_details || ''
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-on-surface-variant flex items-center justify-center gap-2">
        <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"></div>
        <span>Loading company profile...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="font-headline-md text-headline-md text-primary tracking-tight mb-2">Company Profile</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mb-6">Manage your business details and workspace settings.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
        <h3 className="font-title-md text-title-md text-on-surface mb-6 border-b border-outline-variant pb-4">Basic Information</h3>
        
        <div className="space-y-6">
          {/* Tenant ID Display */}
          <div>
            <label className="block font-label-md text-label-md text-on-surface mb-2">Workspace ID</label>
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                readOnly
                value={tenantId || ''}
                className="w-full md:w-1/2 px-4 py-3 border border-outline-variant rounded-DEFAULT bg-surface-container-high font-body-sm text-on-surface-variant font-mono cursor-not-allowed"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(tenantId || '');
                  showSuccess('Workspace ID copied to clipboard');
                }}
                className="p-3 border border-outline-variant rounded-DEFAULT hover:bg-surface-container-high transition-colors text-on-surface-variant cursor-pointer flex items-center justify-center"
                title="Copy to clipboard"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>content_copy</span>
              </button>
            </div>
            <p className="text-xs text-on-surface-variant mt-1">Provide this ID to support if you need assistance.</p>
          </div>

          {/* Logo Placeholder */}
          <div>
            <label className="block font-label-md text-label-md text-on-surface mb-2">Business Logo</label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-surface-container-high border-2 border-dashed border-outline-variant flex items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined">image</span>
              </div>
              <div className="text-sm text-on-surface-variant">
                <p>Upload functionality coming soon.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Business Name" required error={errors.name}>
              <input 
                type="text" 
                disabled={!isAdmin}
                {...register('name')}
                className={`w-full px-4 py-3 border rounded-DEFAULT bg-surface-container-lowest font-body-md text-on-surface focus:ring-1 focus:ring-primary focus:border-primary transition-all disabled:opacity-60 ${
                  errors.name ? 'border-red-500' : 'border-outline-variant'
                }`}
              />
            </FormField>
            
            <FormField label="Phone Number" error={errors.phone}>
              <input 
                type="tel" 
                disabled={!isAdmin}
                {...register('phone')}
                placeholder="e.g. 555-0199"
                className={`w-full px-4 py-3 border rounded-DEFAULT bg-surface-container-lowest font-body-md text-on-surface focus:ring-1 focus:ring-primary focus:border-primary transition-all disabled:opacity-60 ${
                  errors.phone ? 'border-red-500' : 'border-outline-variant'
                }`}
              />
            </FormField>

            <FormField label="Address" error={errors.address} className="md:col-span-2">
              <input 
                type="text" 
                disabled={!isAdmin}
                {...register('address')}
                placeholder="e.g. 123 Main St, Suite 100"
                className={`w-full px-4 py-3 border rounded-DEFAULT bg-surface-container-lowest font-body-md text-on-surface focus:ring-1 focus:ring-primary focus:border-primary transition-all disabled:opacity-60 ${
                  errors.address ? 'border-red-500' : 'border-outline-variant'
                }`}
              />
            </FormField>

            <FormField label="Timezone" error={errors.timezone}>
              <select
                disabled={!isAdmin}
                {...register('timezone')}
                className="w-full px-4 py-3 border border-outline-variant rounded-DEFAULT bg-surface-container-lowest font-body-md text-on-surface focus:ring-1 focus:ring-primary focus:border-primary transition-all disabled:opacity-60"
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time (US & Canada)</option>
                <option value="America/Chicago">Central Time (US & Canada)</option>
                <option value="America/Denver">Mountain Time (US & Canada)</option>
                <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
              </select>
            </FormField>
          </div>
          
          {/* Invoice & Payment Settings */}
          <div className="pt-6 border-t border-outline-variant mt-6">
            <h4 className="font-title-sm text-title-sm text-on-surface mb-4">Invoice & Payment Settings</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField label="Business Tagline (Printed on Invoices)" error={errors.business_tagline} className="md:col-span-2">
                <input 
                  type="text" 
                  disabled={!isAdmin}
                  {...register('business_tagline')}
                  placeholder="e.g. Quality work at a fair price"
                  className="w-full px-4 py-3 border border-outline-variant rounded-DEFAULT bg-surface-container-lowest font-body-md text-on-surface focus:ring-1 focus:ring-primary focus:border-primary transition-all disabled:opacity-60"
                />
              </FormField>

              <FormField label="Payment Method Name" error={errors.payment_method}>
                <input 
                  type="text" 
                  disabled={!isAdmin}
                  {...register('payment_method')}
                  placeholder="e.g. Bank Transfer, Venmo, Check"
                  className="w-full px-4 py-3 border border-outline-variant rounded-DEFAULT bg-surface-container-lowest font-body-md text-on-surface focus:ring-1 focus:ring-primary focus:border-primary transition-all disabled:opacity-60"
                />
              </FormField>

              <FormField label="Payment Details" error={errors.payment_details}>
                <input 
                  type="text" 
                  disabled={!isAdmin}
                  {...register('payment_details')}
                  placeholder="e.g. Routing/Account # or @username"
                  className="w-full px-4 py-3 border border-outline-variant rounded-DEFAULT bg-surface-container-lowest font-body-md text-on-surface focus:ring-1 focus:ring-primary focus:border-primary transition-all disabled:opacity-60"
                />
              </FormField>
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-outline-variant">
            <button 
              type="button" 
              onClick={handleCancel}
              disabled={isSubmitting || updateMutation.isPending || !isDirty}
              className="px-6 py-2 border border-outline-variant text-on-surface font-title-sm rounded-DEFAULT hover:bg-surface-container-high transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting || updateMutation.isPending}
              className="px-6 py-2 bg-primary text-on-primary font-title-sm rounded-DEFAULT hover:opacity-90 transition-opacity shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {(isSubmitting || updateMutation.isPending) && (
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent"></div>
              )}
              <span>{isSubmitting || updateMutation.isPending ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        )}
      </form>

      {/* Danger Zone (Admin Only) */}
      {isAdmin && (
        <div className="mt-12 border border-red-200 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-red-50/50 p-6">
            <h3 className="font-title-md text-title-md text-red-700 mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-red-600" style={{ fontSize: '20px' }}>warning</span>
              Danger Zone
            </h3>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mt-4 w-full">
              <div className="w-full md:flex-1">
                <h4 className="font-title-sm text-on-surface mb-1">Delete Workspace</h4>
                <p className="font-body-sm text-on-surface-variant">
                  Permanently delete this workspace and all associated data. This action is irreversible and affects all members.
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setDeleteModalOpen(true)}
                className="bg-red-600 hover:bg-red-700 text-white font-title-sm py-2.5 px-6 rounded-DEFAULT transition-colors whitespace-nowrap shadow-sm cursor-pointer"
              >
                Delete Workspace
              </button>
            </div>
          </div>
        </div>
      )}

      {isAdmin && (
        <DeleteWorkspaceModal 
          isOpen={deleteModalOpen} 
          onClose={() => setDeleteModalOpen(false)} 
          tenantName={workspace?.name || userData?.tenant_name}
          tenantId={tenantId}
        />
      )}
    </div>
  );
};
