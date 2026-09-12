import { z } from 'zod';
import { ALL_VALID_COLOR_TAGS } from '../components/calendar/calendarColors';

export const appointmentSchema = z.object({
  title: z.string().trim().min(1, 'Appointment title is required').max(255, 'Title cannot exceed 255 characters'),
  description: z.string().optional().or(z.literal('')).nullable().transform(val => val || null),
  start_time: z.string().min(1, 'Start date and time is required'),
  end_time: z.string().min(1, 'End date and time is required'),
  all_day: z.boolean().optional().default(false),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled', 'rescheduled']).default('scheduled'),
  color_tag: z.enum(ALL_VALID_COLOR_TAGS).default('blue'),
  contact_role: z.enum(['billing_client', 'site_resident', 'property_manager', 'custom']).default('billing_client'),
  contact_name: z.string().max(255).optional().or(z.literal('')).nullable().transform(val => val || null),
  contact_phone: z.string().max(50).optional().or(z.literal('')).nullable().transform(val => val || null),
  location_address: z.string().optional().or(z.literal('')).nullable().transform(val => val || null),
  reminder_minutes: z.coerce.number().min(0, 'Reminder minutes cannot be negative').default(60),
  client_id: z.string().optional().or(z.literal('')).nullable().transform(val => val || null),
  job_id: z.string().optional().or(z.literal('')).nullable().transform(val => val || null),
  property_id: z.string().optional().or(z.literal('')).nullable().transform(val => val || null),
  user_id: z.string().optional().or(z.literal('')).nullable().transform(val => val || null)
}).refine(data => {
  if (data.start_time && data.end_time) {
    const startMs = new Date(data.start_time).getTime();
    const endMs = new Date(data.end_time).getTime();
    return !isNaN(startMs) && !isNaN(endMs) && endMs >= startMs;
  }
  return true;
}, {
  message: 'End time cannot be earlier than start time',
  path: ['end_time']
});
