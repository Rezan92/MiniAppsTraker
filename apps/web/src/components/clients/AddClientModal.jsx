import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { BaseModal } from '../common/BaseModal';
import { FormField } from '../common/FormField';
import { clientSchema } from '../../schemas/clientSchema';

export const AddClientModal = ({ open, onClose, onSubmit, formData, editMode }) => {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      client_type: 'residential',
      company_name: '',
      name: '',
      email: '',
      phone: '',
      address: '',
      notes: '',
      status: 'active',
      ...formData
    }
  });

  const selectedClientType = watch('client_type');

  useEffect(() => {
    if (open) {
      reset({
        client_type: 'residential',
        company_name: '',
        name: '',
        email: '',
        phone: '',
        address: '',
        notes: '',
        status: 'active',
        ...formData
      });
    }
  }, [open, formData, reset]);

  const onValidSubmit = (data) => {
    onSubmit(data);
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
        form="add-client-form"
        disabled={isSubmitting}
        className="px-5 py-2 bg-primary text-black font-body-md font-bold rounded-lg cursor-pointer hover:bg-opacity-90 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
      >
        {isSubmitting ? 'Saving...' : editMode ? 'Save Changes' : 'Add Client'}
      </button>
    </>
  );

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={editMode ? 'Edit Client' : 'Add New Client'}
      footer={footer}
      size="md"
    >
      <form className="space-y-5" id="add-client-form" onSubmit={handleSubmit(onValidSubmit)}>
        {/* Client Type */}
        <FormField label="Client Type">
          <div className="flex gap-4 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                className="text-primary focus:ring-primary h-4 w-4 border-gray-300 cursor-pointer" 
                type="radio" 
                value="residential" 
                {...register('client_type')}
              />
              <span className="text-sm text-gray-700">Residential</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                className="text-primary focus:ring-primary h-4 w-4 border-gray-300 cursor-pointer" 
                type="radio" 
                value="commercial" 
                {...register('client_type')}
              />
              <span className="text-sm text-gray-700">Commercial</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                className="text-primary focus:ring-primary h-4 w-4 border-gray-300 cursor-pointer" 
                type="radio" 
                value="property_manager" 
                {...register('client_type')}
              />
              <span className="text-sm text-gray-700">Property Manager</span>
            </label>
          </div>
        </FormField>
        
        {/* Full Name */}
        <FormField label="Full Name" error={errors.name} required>
          <input 
            className={`w-full px-3 py-2 border rounded-lg bg-surface text-gray-900 focus:outline-none focus:ring-1 transition-shadow placeholder:text-gray-400 ${
              errors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-primary focus:ring-primary'
            }`}
            placeholder="e.g. John Doe" 
            type="text" 
            {...register('name')}
          />
        </FormField>

        {/* Company Name */}
        {(selectedClientType === 'commercial' || selectedClientType === 'property_manager') && (
          <FormField label="Company Name / LLC" error={errors.company_name}>
            <input 
              className="w-full px-3 py-2 border rounded-lg bg-surface text-gray-900 border-gray-300 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow placeholder:text-gray-400"
              placeholder="e.g. Acme Property Management LLC" 
              type="text" 
              {...register('company_name')}
            />
          </FormField>
        )}
        
        {/* Contact Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <FormField label="Email Address" error={errors.email}>
            <input 
              className={`w-full px-3 py-2 border rounded-lg bg-surface text-gray-900 focus:outline-none focus:ring-1 transition-shadow placeholder:text-gray-400 ${
                errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-primary focus:ring-primary'
              }`} 
              placeholder="email@example.com" 
              type="email" 
              {...register('email')}
            />
          </FormField>
          <FormField label="Phone Number" error={errors.phone} required>
            <input 
              className={`w-full px-3 py-2 border rounded-lg bg-surface text-gray-900 focus:outline-none focus:ring-1 transition-shadow placeholder:text-gray-400 ${
                errors.phone ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-primary focus:ring-primary'
              }`}
              placeholder="(555) 000-0000" 
              type="tel" 
              {...register('phone')}
            />
          </FormField>
        </div>
        
        {/* Address */}
        <FormField label="Physical Address" error={errors.address}>
          <input 
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-surface text-gray-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow placeholder:text-gray-400" 
            placeholder="123 Main St, City, State ZIP" 
            type="text" 
            {...register('address')}
          />
        </FormField>
        
        {/* Notes */}
        <FormField label="Notes (Optional)" error={errors.notes}>
          <textarea 
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-surface text-gray-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow placeholder:text-gray-400 resize-none h-24" 
            placeholder="Additional details about the client..."
            {...register('notes')}
          />
        </FormField>
      </form>
    </BaseModal>
  );
};
