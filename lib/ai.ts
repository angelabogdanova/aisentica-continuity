import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { manifestSchema, type CreationInput } from './schema';
import type { Manifest } from './types';

export interface AIService {
  generateManifest(input: CreationInput): Promise<Manifest>;
}

export class AIServiceError extends Error {
  constructor(message: string, public readonly kind: 'configuration' | 'refusal' | 'malformed' | 'api') {
    super(message);
  }
}

function fallback(input: CreationInput): Manifest {
  return manifestSchema.parse({
    canonicalName: input.agentName,
    role: `${input.field} Agent`,
    purpose: input.purpose,
    field: input.field,
    capabilities: ['Structured research', 'Method preservation', 'Evidence synthesis'],
    operatingPrinciples: input.operatingPrinciples.split(/[,;]/).map((item) => item.trim()).filter(Boolean),
    memorySchema: ['Validated methods', 'Source records', 'Open uncertainties'],
    transferableStateRules: ['Preserve versioned state history', 'Record lifecycle events', 'Keep canonical identity stable'],
    privateOwnerDataRules: ['Never include owner credentials in public state', 'Separate private owner instructions from public identity'],
    publicIdentitySummary: `${input.agentName} is a ${input.field} agent for structured, traceable work.`,
  });
}

export class OpenAIManifestService implements AIService {
  async generateManifest(input: CreationInput): Promise<Manifest> {
    if (!process.env.OPENAI_API_KEY) {
      if (process.env.ENABLE_LOCAL_AI_FALLBACK === 'true') return fallback(input);
      throw new AIServiceError('GPT-5.6 is unavailable. Configure OPENAI_API_KEY or explicitly enable local fallback.', 'configuration');
    }

    try {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await client.responses.parse({
        model: process.env.OPENAI_MODEL || 'gpt-5.6',
        input: [
          { role: 'system', content: 'Create a complete Agent Manifest from the supplied creation request.' },
          { role: 'user', content: JSON.stringify(input) },
        ],
        text: { format: zodTextFormat(manifestSchema, 'agent_manifest') },
      });
      if (response.output?.some((item) => item.type === 'message' && item.content.some((part) => part.type === 'refusal'))) {
        throw new AIServiceError('GPT-5.6 declined to generate this Agent Manifest.', 'refusal');
      }
      if (!response.output_parsed) {
        throw new AIServiceError('GPT-5.6 returned no structured Agent Manifest.', 'malformed');
      }
      return manifestSchema.parse(response.output_parsed);
    } catch (error) {
      if (error instanceof AIServiceError) throw error;
      throw new AIServiceError('GPT-5.6 request failed. Please try again.', 'api');
    }
  }
}

export const aiService: AIService = new OpenAIManifestService();
export const localFallbackEnabled = () => !process.env.OPENAI_API_KEY && process.env.ENABLE_LOCAL_AI_FALLBACK === 'true';
