import { z } from 'zod';

export const developmentInputSchema = z.object({
  task: z.string().trim().min(20).max(1500),
  contextAndEvidence: z.string().trim().min(20).max(5000),
  successCriteria: z.string().trim().min(10).max(1000),
}).strict();

const items = z.array(z.string().trim().min(1).max(600)).max(10);
export const developmentRecordSchema = z.object({
  taskSummary: z.string().trim().min(10).max(800),
  workResult: z.string().trim().min(20).max(6000),
  validatedKnowledge: items,
  reusableMethods: items,
  evidenceAssessment: items,
  corrections: items,
  openQuestions: items,
  limitations: items,
  confidenceStatement: z.string().trim().min(10).max(800),
  publicDevelopmentSummary: z.string().trim().min(10).max(500),
}).strict();

export type DevelopmentInput = z.infer<typeof developmentInputSchema>;
