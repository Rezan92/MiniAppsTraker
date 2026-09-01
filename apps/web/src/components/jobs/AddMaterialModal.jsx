import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DatePicker } from '../common/DatePicker';
import { BaseModal } from '../common/BaseModal';
import { FormField } from '../common/FormField';
import { materialSchema } from '../../schemas/materialSchema';

export const AddMaterialModal = ({ open, onClose, onSubmit, matData = {} }) => {
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(materialSchema),
    mode: 'onChange',
    defaultValues: {
      description: '',
      cost: 20.00,
      is_from_stock: false,
      store: '',
      purchase_date: new Date().toISOString().split('T')[0],
      notes: '',
      ...matData
    }
  });

  const selectedStore = watch('store');

  useEffect(() => {
    if (open) {
      reset({
        description: '',
        cost: 20.00,
        is_from_stock: false,
        store: '',
        purchase_date: new Date().toISOString().split('T')[0],
        notes: '',
        ...matData
      });
    }
  }, [open, matData, reset]);

  const onValidSubmit = (data) => {
    onSubmit({
      ...data,
      id: matData?.id
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
        form="add-material-form"
        disabled={isSubmitting}
        className="px-5 py-2 bg-primary text-black font-body-md font-bold rounded-lg cursor-pointer hover:bg-opacity-90 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
      >
        {isSubmitting ? 'Saving...' : matData?.id ? 'Save Changes' : 'Add Material'}
      </button>
    </>
  );

  const standardStores = ['Home Depot', "Lowe's", 'Menards', 'Ace Hardware', 'Amazon', 'Walmart'];
  const isCustomStore = selectedStore && !standardStores.includes(selectedStore);

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={matData?.id ? 'Edit Material' : 'Add Material to Job'}
      footer={footer}
      size="md"
    >
      <form className="space-y-5" id="add-material-form" onSubmit={handleSubmit(onValidSubmit)}>
        {/* Description */}
        <FormField label="Description" error={errors.description} required>
          <input 
            className={`w-full px-3 py-2 border rounded-lg bg-surface text-gray-900 focus:outline-none focus:ring-1 transition-shadow placeholder:text-gray-400 ${
              errors.description ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-primary focus:ring-primary'
            }`}
            placeholder="e.g. Copper pipes" 
            type="text" 
            {...register('description')}
          />
        </FormField>
        
        {/* Cost and Purchase Date Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <FormField label="Cost ($)" error={errors.cost} required>
            <input 
              className={`w-full px-3 py-2 border rounded-lg bg-surface text-gray-900 focus:outline-none focus:ring-1 transition-shadow placeholder:text-gray-400 ${
                errors.cost ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-primary focus:ring-primary'
              }`} 
              placeholder="e.g. 45.00" 
              type="number" 
              min="0"
              step="0.01"
              {...register('cost')}
            />
          </FormField>
          
          <FormField label="Purchase Date" error={errors.purchase_date}>
            <Controller
              name="purchase_date"
              control={control}
              render={({ field }) => (
                <DatePicker
                  value={field.value || ''}
                  onChange={field.onChange}
                  placeholder="Select date"
                />
              )}
            />
          </FormField>
        </div>

        {/* Store */}
        <FormField label="Store / Supplier" error={errors.store}>
          <div className="space-y-2">
            <div className="relative">
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-surface text-gray-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow appearance-none cursor-pointer"
                value={standardStores.includes(selectedStore) ? selectedStore : (selectedStore ? 'Other' : '')}
                onChange={(e) => {
                  if (e.target.value !== 'Other') {
                    setValue('store', e.target.value);
                  } else {
                    setValue('store', 'Other Custom');
                  }
                }}
              >
                <option value="">Select Store</option>
                {standardStores.map(store => (
                  <option key={store} value={store}>{store}</option>
                ))}
                <option value="Other">Other</option>
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">expand_more</span>
            </div>
            
            {isCustomStore && (
              <input 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-surface text-gray-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow placeholder:text-gray-400" 
                placeholder="Enter custom store name" 
                type="text" 
                value={selectedStore === 'Other Custom' ? '' : selectedStore}
                onChange={(e) => setValue('store', e.target.value)}
                autoFocus
              />
            )}
          </div>
        </FormField>

        {/* Notes */}
        <FormField label="Notes" error={errors.notes}>
          <textarea 
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-surface text-gray-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow placeholder:text-gray-400 resize-none h-16" 
            placeholder="Receipt number, warranty info..."
            {...register('notes')}
          />
        </FormField>
        
        {/* Inventory Checkbox */}
        <div className="pt-2">
          <label className="flex items-center gap-3 cursor-pointer group w-fit">
            <input 
              type="checkbox" 
              className="text-primary focus:ring-primary h-5 w-5 border-gray-300 rounded transition-colors cursor-pointer" 
              {...register('is_from_stock')}
            />
            <span className="font-body-md text-gray-800 group-hover:text-primary transition-colors select-none">
              Pulled From Stock Inventory?
            </span>
          </label>
        </div>
      </form>
    </BaseModal>
  );
};
