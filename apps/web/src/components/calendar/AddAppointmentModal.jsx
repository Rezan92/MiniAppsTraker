import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { BaseModal } from '../common/BaseModal';
import { FormField } from '../common/FormField';
import { appointmentSchema } from '../../schemas/appointmentSchema';
import { useClients } from '../../hooks/api/useClients';
import { useJobs } from '../../hooks/api/useJobs';
import { useProperties } from '../../hooks/api/useProperties';
import { GOOGLE_CALENDAR_COLORS } from './calendarColors';

const REMINDER_OPTIONS = [
  { value: 0, label: 'None' },
  { value: 15, label: '15 minutes before' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 120, label: '2 hours before' },
  { value: 1440, label: '1 day before' }
];

// Safely converts any input (string, Date, or Temporal object) to a standard JS Date
function safeParseToJSDate(input) {
  if (!input) return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;

  let str;
  if (typeof input === 'object') {
    if (typeof input.toString === 'function') {
      str = input.toString();
    } else {
      return null;
    }
  } else {
    str = String(input);
  }

  if (!str || str === 'null' || str === 'undefined') return null;

  // "YYYY-MM-DD" e.g. from Month view day click
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [year, month, day] = str.split('-').map(Number);
    return new Date(year, month - 1, day, 9, 0, 0); // Default to 9:00 AM on selected day
  }

  // "YYYY-MM-DD HH:mm" or "YYYY-MM-DDTHH:mm" e.g. from Week view slot click
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(str)) {
    const datePart = str.slice(0, 10);
    const timePart = str.slice(11, 16);
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);
    return new Date(year, month - 1, day, hours, minutes, 0);
  }

  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

// Helper to format ISO string or Date to HTML datetime-local format: YYYY-MM-DDTHH:mm
function toDateTimeLocal(dateInput) {
  if (!dateInput) return '';
  const d = safeParseToJSDate(dateInput);
  if (!d) return '';
  const pad = (n) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export const AddAppointmentModal = ({
  open,
  onClose,
  onSubmit,
  initialData = null,
  defaultDate = null
}) => {
  const { data: clients = [] } = useClients();
  const { data: jobs = [] } = useJobs();

  const getDefaultTimes = (dateInput) => {
    const parsed = safeParseToJSDate(dateInput);
    let base = parsed ? new Date(parsed.getTime()) : new Date();
    if (!parsed) {
      // Default start rounded up to next full hour
      base.setMinutes(0, 0, 0);
      base.setHours(base.getHours() + 1);
    }
    const startStr = toDateTimeLocal(base);
    const end = new Date(base.getTime() + 60 * 60 * 1000); // 1 hour later
    const endStr = toDateTimeLocal(end);
    return { startStr, endStr };
  };

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(appointmentSchema),
    mode: 'onChange',
    defaultValues: {
      title: '',
      description: '',
      start_time: '',
      end_time: '',
      all_day: false,
      status: 'scheduled',
      color_tag: 'blue',
      contact_role: 'billing_client',
      contact_name: '',
      contact_phone: '',
      location_address: '',
      reminder_minutes: 60,
      client_id: '',
      job_id: '',
      property_id: ''
    }
  });

  const selectedClientId = watch('client_id');
  const selectedPropertyId = watch('property_id');
  const selectedContactRole = watch('contact_role');
  const selectedColor = watch('color_tag');
  const startTime = watch('start_time');

  const { data: properties = [] } = useProperties(selectedClientId);

  // Sync form values on open or initialData change
  useEffect(() => {
    if (!open) return;
    if (initialData) {
      reset({
        title: initialData.title || '',
        description: initialData.description || '',
        start_time: toDateTimeLocal(initialData.start_time),
        end_time: toDateTimeLocal(initialData.end_time),
        all_day: Boolean(initialData.all_day),
        status: initialData.status || 'scheduled',
        color_tag: initialData.color_tag || 'blue',
        contact_role: initialData.contact_role || 'billing_client',
        contact_name: initialData.contact_name || '',
        contact_phone: initialData.contact_phone || '',
        location_address: initialData.location_address || '',
        reminder_minutes: initialData.reminder_minutes ?? 60,
        client_id: initialData.client_id || '',
        job_id: initialData.job_id || '',
        property_id: initialData.property_id || ''
      });
    } else {
      const { startStr, endStr } = getDefaultTimes(defaultDate);
      reset({
        title: '',
        description: '',
        start_time: startStr,
        end_time: endStr,
        all_day: false,
        status: 'scheduled',
        color_tag: 'blue',
        contact_role: 'billing_client',
        contact_name: '',
        contact_phone: '',
        location_address: '',
        reminder_minutes: 60,
        client_id: '',
        job_id: '',
        property_id: ''
      });
    }
  }, [open, initialData, defaultDate, reset]);

  // Quick Duration button click handler
  const handleAddDuration = (minutes) => {
    const currentStart = safeParseToJSDate(startTime) || new Date();
    const newEnd = new Date(currentStart.getTime() + minutes * 60 * 1000);
    setValue('end_time', toDateTimeLocal(newEnd), { shouldValidate: true });
  };

  // Client Selection Change: Auto-populate address and billing client info
  const handleClientChange = (clId) => {
    setValue('client_id', clId, { shouldValidate: true, shouldDirty: true });
    setValue('property_id', '', { shouldValidate: true, shouldDirty: true });

    const client = clients.find(c => c.id === clId);
    if (client) {
      if (client.address) {
        setValue('location_address', client.address, { shouldValidate: true });
      }
      if (selectedContactRole === 'billing_client') {
        setValue('contact_name', client.name || '', { shouldValidate: true });
        setValue('contact_phone', client.phone || '', { shouldValidate: true });
      }
    }
  };

  // Property Selection Change: Auto-populate address and resident info
  const handlePropertyChange = (propId) => {
    setValue('property_id', propId, { shouldValidate: true, shouldDirty: true });

    const prop = properties.find(p => p.id === propId);
    if (prop) {
      if (prop.address) {
        setValue('location_address', prop.address, { shouldValidate: true });
      }
      if (selectedContactRole === 'site_resident') {
        setValue('contact_name', prop.renter_name || '', { shouldValidate: true });
        setValue('contact_phone', prop.renter_phone || '', { shouldValidate: true });
      }
    }
  };

  // Contact Role Change: Switch contact details based on role
  const handleRoleChange = (role) => {
    setValue('contact_role', role, { shouldValidate: true, shouldDirty: true });
    if (role === 'billing_client') {
      const client = clients.find(c => c.id === selectedClientId);
      if (client) {
        setValue('contact_name', client.name || '', { shouldValidate: true });
        setValue('contact_phone', client.phone || '', { shouldValidate: true });
      }
    } else if (role === 'site_resident') {
      const prop = properties.find(p => p.id === selectedPropertyId);
      if (prop) {
        setValue('contact_name', prop.renter_name || '', { shouldValidate: true });
        setValue('contact_phone', prop.renter_phone || '', { shouldValidate: true });
      }
    }
  };

  const onValidSubmit = (formData) => {
    const payload = {
      ...formData,
      client_id: formData.client_id || null,
      job_id: formData.job_id || null,
      property_id: formData.property_id || null,
      description: formData.description?.trim() || null,
      location_address: formData.location_address?.trim() || null,
      contact_name: formData.contact_name?.trim() || null,
      contact_phone: formData.contact_phone?.trim() || null,
      start_time: new Date(formData.start_time).toISOString(),
      end_time: new Date(formData.end_time).toISOString()
    };
    if (initialData?.id) {
      payload.id = initialData.id;
    }
    onSubmit(payload);
  };

  const footer = (
    <div className="flex items-center justify-between w-full">
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
        form="add-appointment-form"
        disabled={isSubmitting}
        className="px-5 py-2 bg-primary text-black font-body-md font-bold rounded-lg cursor-pointer hover:bg-opacity-90 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
      >
        {isSubmitting ? 'Saving...' : initialData?.id ? 'Update Appointment' : 'Schedule Appointment'}
      </button>
    </div>
  );

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={initialData?.id ? 'Edit Appointment' : 'New Appointment'}
      subtitle="Schedule work orders, client walkthroughs, or team appointments"
      footer={footer}
      size="lg"
    >
      <form id="add-appointment-form" className="space-y-5" onSubmit={handleSubmit(onValidSubmit)}>
        {/* Title */}
        <FormField label="Appointment Title" error={errors.title} required>
          <input
            type="text"
            placeholder="e.g. HVAC Filter Replacement & Inspection"
            {...register('title')}
            className={`w-full px-3 py-2 border rounded-lg bg-surface text-gray-900 focus:outline-none focus:ring-1 transition-shadow ${
              errors.title ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-primary focus:ring-primary'
            }`}
          />
        </FormField>

        {/* Date & Time Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Start Date & Time" error={errors.start_time} required>
            <input
              type="datetime-local"
              {...register('start_time')}
              className={`w-full px-3 py-2 border rounded-lg bg-surface text-gray-900 focus:outline-none focus:ring-1 transition-shadow ${
                errors.start_time ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-primary focus:ring-primary'
              }`}
            />
          </FormField>

          <FormField label="End Date & Time" error={errors.end_time} required>
            <input
              type="datetime-local"
              {...register('end_time')}
              className={`w-full px-3 py-2 border rounded-lg bg-surface text-gray-900 focus:outline-none focus:ring-1 transition-shadow ${
                errors.end_time ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-primary focus:ring-primary'
              }`}
            />
          </FormField>
        </div>

        {/* Quick Duration Buttons */}
        <div>
          <label className="block text-label-sm font-semibold text-gray-600 mb-1.5">Quick Duration</label>
          <div className="flex flex-wrap gap-2">
            {[
              { label: '+30m', minutes: 30 },
              { label: '+1h', minutes: 60 },
              { label: '+2h', minutes: 120 },
              { label: 'Half Day (4h)', minutes: 240 },
              { label: 'Full Day (8h)', minutes: 480 }
            ].map(({ label, minutes }) => (
              <button
                key={label}
                type="button"
                onClick={() => handleAddDuration(minutes)}
                className="px-2.5 py-1 text-xs font-semibold rounded-md border border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-colors cursor-pointer"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Linked Entities */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 border-t border-gray-100">
          <div>
            <label className="block text-label-sm font-semibold text-gray-700 mb-1">Client (Optional)</label>
            <select
              {...register('client_id')}
              value={selectedClientId || ''}
              onChange={(e) => handleClientChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-surface text-gray-900 text-body-sm focus:outline-none focus:ring-1 focus:border-primary focus:ring-primary cursor-pointer"
            >
              <option value="">-- No Client Linked --</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-label-sm font-semibold text-gray-700 mb-1">Job (Optional)</label>
            <select
              {...register('job_id')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-surface text-gray-900 text-body-sm focus:outline-none focus:ring-1 focus:border-primary focus:ring-primary cursor-pointer"
            >
              <option value="">-- No Job Linked --</option>
              {jobs
                .filter(j => !selectedClientId || j.client_id === selectedClientId)
                .map(j => (
                  <option key={j.id} value={j.id}>{j.title} ({j.status})</option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-label-sm font-semibold text-gray-700 mb-1">Rental Property (Optional)</label>
            <select
              {...register('property_id')}
              value={selectedPropertyId || ''}
              onChange={(e) => handlePropertyChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-surface text-gray-900 text-body-sm focus:outline-none focus:ring-1 focus:border-primary focus:ring-primary cursor-pointer"
            >
              <option value="">-- No Property Linked --</option>
              {properties.map(p => (
                <option key={p.id} value={p.id}>
                  {p.address}{p.name ? ` (${p.name})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Smart Contact Switcher */}
        <div className="pt-2 border-t border-gray-100">
          <label className="block text-label-sm font-semibold text-gray-700 mb-1.5">Contact Details</label>
          <div className="flex items-center gap-2 mb-3">
            {[
              { id: 'billing_client', label: 'Billing Client' },
              { id: 'site_resident', label: 'On-Site Resident' },
              { id: 'property_manager', label: 'Property Manager' },
              { id: 'custom', label: 'Custom' }
            ].map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => handleRoleChange(id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors cursor-pointer ${
                  selectedContactRole === id
                    ? 'bg-primary text-black border-primary shadow-xs'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField label="Contact Name" error={errors.contact_name}>
              <input
                type="text"
                placeholder="e.g. John Smith"
                {...register('contact_name')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-surface text-gray-900 text-body-sm focus:outline-none focus:ring-1 focus:border-primary focus:ring-primary"
              />
            </FormField>

            <FormField label="Contact Phone" error={errors.contact_phone}>
              <input
                type="tel"
                placeholder="e.g. (555) 123-4567"
                {...register('contact_phone')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-surface text-gray-900 text-body-sm focus:outline-none focus:ring-1 focus:border-primary focus:ring-primary"
              />
            </FormField>
          </div>
        </div>

        {/* Location Address */}
        <FormField label="Location Address" error={errors.location_address}>
          <input
            type="text"
            placeholder="e.g. 1234 Main St, Suite 100, Austin, TX"
            {...register('location_address')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-surface text-gray-900 text-body-sm focus:outline-none focus:ring-1 focus:border-primary focus:ring-primary"
          />
        </FormField>

        {/* Status, Color Tag & Reminder */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-gray-100">
          <div>
            <label className="block text-label-sm font-semibold text-gray-700 mb-1">Status</label>
            <select
              {...register('status')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-surface text-gray-900 text-body-sm focus:outline-none focus:ring-1 focus:border-primary focus:ring-primary cursor-pointer"
            >
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="rescheduled">Rescheduled</option>
            </select>
          </div>

          <div>
            <label className="block text-label-sm font-semibold text-gray-700 mb-1">Color Tag</label>
            <div className="flex flex-wrap items-center gap-1.5 pt-1 max-w-[280px]">
              {GOOGLE_CALENDAR_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  title={c.name}
                  onClick={() => setValue('color_tag', c.id)}
                  style={{ backgroundColor: c.hex }}
                  className={`w-5 h-5 rounded-full transition-transform cursor-pointer flex items-center justify-center ${
                    selectedColor === c.id ? 'ring-2 ring-blue-500 ring-offset-2 scale-110' : 'hover:scale-115'
                  }`}
                >
                  {selectedColor === c.id && (
                    <svg
                      className="w-2.5 h-2.5"
                      style={{ color: c.textColor }}
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-label-sm font-semibold text-gray-700 mb-1">Reminder</label>
            <select
              {...register('reminder_minutes')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-surface text-gray-900 text-body-sm focus:outline-none focus:ring-1 focus:border-primary focus:ring-primary cursor-pointer"
            >
              {REMINDER_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Description / Notes */}
        <FormField label="Notes / Description" error={errors.description}>
          <textarea
            rows={2}
            placeholder="Special instructions, gate codes, tools needed..."
            {...register('description')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-surface text-gray-900 text-body-sm focus:outline-none focus:ring-1 focus:border-primary focus:ring-primary resize-none"
          />
        </FormField>
      </form>
    </BaseModal>
  );
};
