import { z } from 'zod';

export const reactivateInputSchema = z.object({
  reason: z.string().trim().min(10).max(500),
}).strict();

export type ReactivateInput = z.infer<typeof reactivateInputSchema>;
