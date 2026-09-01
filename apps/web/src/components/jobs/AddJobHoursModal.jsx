import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DatePicker } from '../common/DatePicker';
import { BaseModal } from '../common/BaseModal';
import { FormField } from '../common/FormField';
import { hoursSchema } from '../../schemas/hoursSchema';

export const AddJobHoursModal = ({ open, isOpen, onClose, onSubmit, hoursData, formData }) => {
  const isModalOpen = open || isOpen;
  const initialData = hoursData || formData || {};

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(hoursSchema),
    mode: 'onChange',
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      start_time: '',
      end_time: '',
      hours: '',
      description: '',
      ...initialData
    }
  });

  const startTime = watch('start_time');
  const endTime = watch('end_time');

  useEffect(() => {
    if (isModalOpen) {
      reset({
        date: new Date().toISOString().split('T')[0],
        start_time: '',
        end_time: '',
        hours: '',
        description: '',
        ...initialData
      });
    }
  }, [isModalOpen, initialData, reset]);

  const calculateHours = (start, end) => {
    if (!start || !end) return '';
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    
    let diff = (endH + endM / 60) - (startH + startM / 60);
    // Handle overnight (e.g. 11 PM to 2 AM)
    if (diff < 0) diff += 24;
    return parseFloat(diff.toFixed(2));
  };

  const addHoursToTime = (startTimeStr, hoursNum) => {
    if (!startTimeStr || isNaN(hoursNum) || hoursNum <= 0) return '';
    const [startH, startM] = startTimeStr.split(':').map(Number);
    const totalMinutes = Math.round(hoursNum * 60);
    const combinedMinutes = startM + totalMinutes;
    const endH = (startH + Math.floor(combinedMinutes / 60)) % 24;
    const endM = combinedMinutes % 60;
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  };

  const handleStartTimeChange = (e) => {
    const val = e.target.value;
    setValue('start_time', val, { shouldValidate: true });
    if (val && endTime) {
      const calc = calculateHours(val, endTime);
      if (calc) setValue('hours', calc, { shouldValidate: true });
    }
  };

  const handleEndTimeChange = (e) => {
    const val = e.target.value;
    setValue('end_time', val, { shouldValidate: true });
    if (startTime && val) {
      const calc = calculateHours(startTime, val);
      if (calc) setValue('hours', calc, { shouldValidate: true });
    }
  };

  const handleHoursChange = (e) => {
    const val = e.target.value;
    setValue('hours', val, { shouldValidate: true });
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      const curStart = startTime || '01:00';
      if (!startTime) {
        setValue('start_time', '01:00', { shouldValidate: true });
      }
      const calculatedEnd = addHoursToTime(curStart, num);
      if (calculatedEnd) {
        setValue('end_time', calculatedEnd, { shouldValidate: true });
      }
    }
  };

  const onValidSubmit = (data) => {
    let finalData = { ...data, id: initialData?.id };
    if (finalData.hours && !finalData.start_time) {
      finalData.start_time = '01:00';
      const hoursNum = parseFloat(finalData.hours);
      const calculatedEnd = addHoursToTime('01:00', hoursNum);
      finalData.end_time = calculatedEnd || '02:00';
    }
    onSubmit(finalData);
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
        form="add-hours-form"
        disabled={isSubmitting}
        className="px-5 py-2 bg-primary text-black font-body-md font-bold rounded-lg cursor-pointer hover:bg-opacity-90 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
      >
        {isSubmitting ? 'Saving...' : initialData?.id ? 'Save Changes' : 'Log Hours'}
      </button>
    </>
  );

  return (
    <BaseModal
      open={isModalOpen}
      onClose={onClose}
      title={initialData?.id ? 'Edit Hours' : 'Log Hours'}
      footer={footer}
      size="sm"
    >
      <form className="space-y-5" id="add-hours-form" onSubmit={handleSubmit(onValidSubmit)}>
        {/* Date */}
        <FormField label="Date" error={errors.date} required>
          <Controller
            name="date"
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

        {/* Times */}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Start Time" error={errors.start_time}>
            <input 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-surface text-gray-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow" 
              type="time" 
              {...register('start_time')}
              onChange={handleStartTimeChange}
            />
          </FormField>
          <FormField label="End Time" error={errors.end_time}>
            <input 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-surface text-gray-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow" 
              type="time" 
              {...register('end_time')}
              onChange={handleEndTimeChange}
            />
          </FormField>
        </div>
        
        {/* Hours */}
        <FormField label="Total Hours" error={errors.hours} required>
          <input 
            className={`w-full px-3 py-2 border rounded-lg bg-surface text-gray-900 focus:outline-none focus:ring-1 transition-shadow placeholder:text-gray-400 ${
              errors.hours ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-primary focus:ring-primary'
            }`} 
            placeholder="e.g. 2.5" 
            type="number" 
            min="0"
            step="0.01"
            {...register('hours')}
            onChange={handleHoursChange}
          />
        </FormField>

        {/* Description */}
        <FormField label="Work Description" error={errors.description} required>
          <textarea 
            className={`w-full px-3 py-2 border rounded-lg bg-surface text-gray-900 focus:outline-none focus:ring-1 transition-shadow placeholder:text-gray-400 resize-none h-20 ${
              errors.description ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-primary focus:ring-primary'
            }`}
            placeholder="E.g., Initial site prep, pipe repair..."
            {...register('description')}
          />
        </FormField>
      </form>
    </BaseModal>
  );
};
