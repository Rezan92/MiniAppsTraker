import { z } from 'zod';

export const jobSchema = z.object({
  client_id: z.string().min(1, 'Please select a client'),
  property_id: z.string().optional().or(z.literal('')).nullable(),
  title: z.string().trim().min(1, 'Job title is required'),
  rate_type: z.enum(['flat', 'hourly']).default('flat'),
  hourly_rate: z.coerce.number().min(0, 'Hourly rate cannot be negative').optional().nullable(),
  flat_rate: z.coerce.number().min(0, 'Flat rate cannot be negative').optional().nullable(),
  start_date: z.string().optional().or(z.literal('')).nullable(),
  end_date: z.string().optional().or(z.literal('')).nullable(),
  notes: z.string().optional().or(z.literal('')).nullable()
}).refine((data) => {
  if (data.rate_type === 'hourly') {
    return data.hourly_rate !== undefined && data.hourly_rate !== null && data.hourly_rate > 0;
  }
  if (data.rate_type === 'flat') {
    return data.flat_rate !== undefined && data.flat_rate !== null && data.flat_rate >= 0;
  }
  return true;
}, {
  message: 'Please provide a valid rate',
  path: ['rate_type']
}).refine((data) => {
  if (data.start_date && data.end_date) {
    return new Date(data.end_date) >= new Date(data.start_date);
  }
  return true;
}, {
  message: 'End date cannot be before start date',
  path: ['end_date']
});
