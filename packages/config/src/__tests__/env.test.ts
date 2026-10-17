import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getPublicEnv, publicEnvSchema } from '../env.public';

describe('Public Environment Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('validates public environment variables successfully', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-tenant.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key-123';
    process.env.NODE_ENV = 'test';

    const env = getPublicEnv();
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe('https://test-tenant.supabase.co');
    expect(env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe('test-anon-key-123');
    expect(env.NODE_ENV).toBe('test');
  });

  it('ensures service role key is NEVER accessible via getPublicEnv()', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-tenant.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key-123';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'super-secret-service-role-key';

    const env = getPublicEnv();
    // Service role key must not be a property of PublicEnv
    expect((env as Record<string, unknown>).SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
    // publicEnvSchema shape must not contain SUPABASE_SERVICE_ROLE_KEY
    expect(publicEnvSchema.shape).not.toHaveProperty('SUPABASE_SERVICE_ROLE_KEY');
  });

  it('throws when required public environment variables are missing', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    expect(() => getPublicEnv()).toThrow('Invalid public environment variables');
  });
});
