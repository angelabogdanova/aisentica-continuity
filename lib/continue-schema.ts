import { z } from 'zod';

export const continueInputSchema = z.object({
  objective: z.string().trim().min(20).max(1000),
}).strict();

export type ContinueInput = z.infer<typeof continueInputSchema>;
