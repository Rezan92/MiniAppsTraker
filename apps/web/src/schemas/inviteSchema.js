import { z } from 'zod';

export const inviteSchema = z.object({
  email: z.string().email("Please provide a valid email address"),
  role: z.enum(['admin', 'employee']).default('employee')
});
