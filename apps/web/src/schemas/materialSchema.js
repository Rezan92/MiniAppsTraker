import { z } from 'zod';

export const materialSchema = z.object({
  description: z.string().trim().min(1, 'Description is required'),
  cost: z.coerce.number().positive('Cost must be greater than 0'),
  purchase_date: z.string().optional().or(z.literal('')),
  store: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  is_from_stock: z.boolean().default(false)
});
