import { z } from 'zod';

const ServerEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_NAME: z.string().min(1).default('PlayGrowth AI'),
  DATABASE_URL: z.string().url().optional(),
  REDIS_URL: z.string().url().optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  AI_MODEL_ANALYSIS: z.string().min(1).optional(),
  AI_MODEL_COPY_DRAFT: z.string().min(1).optional(),
  AI_MODEL_IMAGE: z.string().min(1).optional(),
});

export const serverEnv = ServerEnvSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  APP_NAME: process.env.APP_NAME,
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  AI_MODEL_ANALYSIS: process.env.AI_MODEL_ANALYSIS,
  AI_MODEL_COPY_DRAFT: process.env.AI_MODEL_COPY_DRAFT,
  AI_MODEL_IMAGE: process.env.AI_MODEL_IMAGE,
});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;
