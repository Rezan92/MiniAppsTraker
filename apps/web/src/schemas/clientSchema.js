import { z } from 'zod';

export const clientSchema = z.object({
  client_type: z.enum(['residential', 'commercial', 'property_manager']).default('residential'),
  name: z.string().trim().min(1, 'Full name is required').refine(val => !/[0-9]/.test(val), {
    message: 'Name cannot contain numbers'
  }),
  company_name: z.string().trim().optional().or(z.literal('')),
  email: z.string().trim().optional().or(z.literal('')).refine(
    val => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
    { message: 'Please enter a valid email address' }
  ),
  phone: z.string().trim().min(1, 'Phone number is required').refine(val => !/[a-zA-Z]/.test(val), {
    message: 'Phone number cannot contain letters'
  }),
  address: z.string().trim().optional().or(z.literal('')),
  notes: z.string().trim().optional().or(z.literal('')),
  status: z.enum(['active', 'inactive']).default('active')
});
