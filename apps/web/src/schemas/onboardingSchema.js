import { z } from 'zod';

export const onboardingSchema = z.object({
  name: z.string().min(2, "Business name must be at least 2 characters"),
  phone: z.string()
    .regex(/^\+?[\d\s\-\(\)]+$/, "Phone number must contain only numbers and standard formatting characters")
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform(val => val || null),
  address: z.string().optional().nullable().or(z.literal('')).transform(val => val || null)
});
