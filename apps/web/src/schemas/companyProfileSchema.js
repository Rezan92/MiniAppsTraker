import { z } from 'zod';

export const companyProfileSchema = z.object({
  name: z.string().min(2, "Business name must be at least 2 characters"),
  phone: z.string()
    .regex(/^\+?[\d\s\-\(\)]+$/, "Phone number must contain only numbers and standard formatting characters")
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform(val => val || null),
  address: z.string().optional().nullable().or(z.literal('')).transform(val => val || null),
  timezone: z.string().default('UTC'),
  business_tagline: z.string().optional().nullable().or(z.literal('')).transform(val => val || null),
  payment_method: z.string().optional().nullable().or(z.literal('')).transform(val => val || null),
  payment_details: z.string().optional().nullable().or(z.literal('')).transform(val => val || null)
});
