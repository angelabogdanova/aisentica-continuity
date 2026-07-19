import { z } from 'zod';

export const parkInputSchema = z.object({
  reason: z.string().trim().min(10).max(500),
}).strict();

export type ParkInput = z.infer<typeof parkInputSchema>;
