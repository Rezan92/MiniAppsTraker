import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DatePicker } from '../common/DatePicker';
import { BaseModal } from '../common/BaseModal';
import { FormField } from '../common/FormField';
import { useProperties } from '../../hooks/api/useProperties';
import { jobSchema } from '../../schemas/jobSchema';

export const AddJobModal = ({ open, onClose, onSubmit, formData, clients = [] }) => {
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      client_id: '',
      property_id: '',
      title: '',
      rate_type: 'flat',
      hourly_rate: 65.00,
      flat_rate: '',
      start_date: '',
      end_date: '',
      notes: '',
      ...formData
    }
  });

  const selectedClientId = watch('client_id');
  const selectedRateType = watch('rate_type');
  const selectedClient = clients.find(c => c.id === selectedClientId);
  const { data: properties = [] } = useProperties(selectedClientId);

  useEffect(() => {
    if (open) {
      reset({
        client_id: '',
        property_id: '',
        title: '',
        rate_type: 'flat',
        hourly_rate: 65.00,
        flat_rate: '',
        start_date: '',
        end_date: '',
        notes: '',
        ...formData
      });
    }
  }, [open, formData, reset]);

  const onValidSubmit = (data) => {
    onSubmit({
      ...data,
      id: formData?.id
    });
  };

  const footer = (
    <>
      <button 
        type="button"
        onClick={onClose}
        disabled={isSubmitting}
        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-body-md font-bold rounded-lg cursor-pointer hover:bg-gray-50 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
      >
        Cancel
      </button>
      <button 
        type="submit"
        form="add-job-form"
        disabled={isSubmitting}
        className="px-5 py-2 bg-primary text-black font-body-md font-bold rounded-lg cursor-pointer hover:bg-opacity-90 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
      >
        {isSubmitting ? 'Saving...' : formData?.id ? 'Update Job' : 'Create Job'}
      </button>
    </>
  );

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={formData?.id ? 'Update Job' : 'Add New Job'}
      footer={footer}
      size="md"
    >
      <form className="space-y-5" id="add-job-form" onSubmit={handleSubmit(onValidSubmit)}>
        {/* Select Client */}
        <FormField label="Select Client" error={errors.client_id} required>
          <div className="relative">
            <select 
              className={`w-full px-3 py-2 border rounded-lg bg-surface text-gray-900 focus:outline-none focus:ring-1 transition-shadow appearance-none cursor-pointer ${
                errors.client_id ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-primary focus:ring-primary'
              }`}
              {...register('client_id')}
            >
              <option value="" disabled>Select a client...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">expand_more</span>
          </div>
        </FormField>

        {/* Select Property */}
        {selectedClientId && (
          <FormField label="Select Property (Optional)" error={errors.property_id}>
            <div className="relative">
              <select 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-surface text-gray-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow appearance-none cursor-pointer" 
                {...register('property_id')}
              >
                <option value="">
                  {selectedClient?.address ? `[Primary Address] ${selectedClient.address}` : 'None (Link to Client Only)'}
                </option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.name ? `${p.name} - ` : ''}{p.address}</option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">expand_more</span>
            </div>
          </FormField>
        )}
        
        {/* Job Title */}
        <FormField label="Job Title" error={errors.title} required>
          <input 
            className={`w-full px-3 py-2 border rounded-lg bg-surface text-gray-900 focus:outline-none focus:ring-1 transition-shadow placeholder:text-gray-400 ${
              errors.title ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-primary focus:ring-primary'
            }`} 
            placeholder="e.g. Kitchen Remodel Plumbing" 
            type="text" 
            {...register('title')}
          />
        </FormField>
        
        {/* Rate Type and Rate Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <FormField label="Rate Type" error={errors.rate_type}>
            <div className="relative">
              <select 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-surface text-gray-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow appearance-none cursor-pointer" 
                {...register('rate_type')}
              >
                <option value="flat">Flat Rate</option>
                <option value="hourly">Hourly Rate</option>
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">expand_more</span>
            </div>
          </FormField>
          
          {selectedRateType === 'hourly' ? (
            <FormField label="Hourly Rate ($)" error={errors.hourly_rate} required>
              <input 
                className={`w-full px-3 py-2 border rounded-lg bg-surface text-gray-900 focus:outline-none focus:ring-1 transition-shadow placeholder:text-gray-400 ${
                  errors.hourly_rate ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-primary focus:ring-primary'
                }`} 
                placeholder="e.g. 75.00" 
                type="number" 
                min="0"
                step="0.01"
                {...register('hourly_rate')}
              />
            </FormField>
          ) : (
            <FormField label="Flat Rate ($)" error={errors.flat_rate} required>
              <input 
                className={`w-full px-3 py-2 border rounded-lg bg-surface text-gray-900 focus:outline-none focus:ring-1 transition-shadow placeholder:text-gray-400 ${
                  errors.flat_rate ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-primary focus:ring-primary'
                }`} 
                placeholder="e.g. 500.00" 
                type="number" 
                min="0"
                step="0.01"
                {...register('flat_rate')}
              />
            </FormField>
          )}
        </div>

        {/* Dates Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <FormField label="Start Date" error={errors.start_date}>
            <Controller
              name="start_date"
              control={control}
              render={({ field }) => (
                <DatePicker
                  value={field.value || ''}
                  onChange={field.onChange}
                  placeholder="Select start date"
                />
              )}
            />
          </FormField>
          <FormField label="End Date" error={errors.end_date}>
            <Controller
              name="end_date"
              control={control}
              render={({ field }) => (
                <DatePicker
                  value={field.value || ''}
                  onChange={field.onChange}
                  placeholder="Select end date"
                />
              )}
            />
          </FormField>
        </div>

        {/* Notes */}
        <FormField label="Job Notes" error={errors.notes}>
          <textarea 
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-surface text-gray-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow placeholder:text-gray-400 resize-none h-20" 
            placeholder="Initial assessment, scope details..."
            {...register('notes')}
          />
        </FormField>
      </form>
    </BaseModal>
  );
};
