import { z } from 'zod';

const serverEnvSchema = z.object({
  FIREBASE_SERVICE_ACCOUNT_KEY: z.string().min(1, 'FIREBASE_SERVICE_ACCOUNT_KEY is required'),
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  GROQ_API_KEY: z.string().optional(),
  ADMIN_EMAIL: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
});

export function getServerEnv() {
  const result = serverEnvSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid or missing server environment variables:\n${missing}`);
  }
  return result.data;
}
