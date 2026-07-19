import { z } from 'zod';

export const transferInputSchema = z.object({
  intendedOwnerId: z.enum(['owner-a', 'owner-b']),
  handoffSummary: z.string().trim().min(20).max(1000),
}).strict();

export type TransferInput = z.infer<typeof transferInputSchema>;
