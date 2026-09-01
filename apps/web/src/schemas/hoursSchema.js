import { z } from 'zod';

export const hoursSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  start_time: z.string().optional().or(z.literal('')),
  end_time: z.string().optional().or(z.literal('')),
  hours: z.coerce.number().positive('Hours must be greater than 0'),
  description: z.string().trim().min(1, 'Work description is required')
});
