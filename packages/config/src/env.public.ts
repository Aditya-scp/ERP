import { z } from 'zod';

export const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

/**
 * Validates and returns public environment variables.
 * Note: Properties must be accessed explicitly as process.env.NEXT_PUBLIC_*
 * so that bundlers (Next.js / Metro) can statically inline them during build time.
 */
export function getPublicEnv(): PublicEnv {
  const values = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NODE_ENV: process.env.NODE_ENV,
  };

  const parsed = publicEnvSchema.safeParse(values);
  if (!parsed.success) {
    console.error('Invalid public environment variables:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid public environment variables');
  }

  return parsed.data;
}
