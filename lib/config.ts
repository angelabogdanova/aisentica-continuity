export type StorageBackend = 'memory' | 'supabase';

const developmentSecret = 'local-development-secret-not-for-production-123456';

export function demoSessionSecret(): string {
  const configured = process.env.DEMO_SESSION_SECRET;
  if (process.env.NODE_ENV === 'production') {
    if (!configured || configured.length < 32) {
      throw new Error('DEMO_SESSION_SECRET must be at least 32 characters in production.');
    }
    return configured;
  }

  return configured || developmentSecret;
}

export function storageBackend(): StorageBackend {
  const backend = process.env.STORAGE_BACKEND;
  if (backend === 'memory' || backend === 'supabase') return backend;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('STORAGE_BACKEND=supabase is required in production.');
  }
  throw new Error('Set STORAGE_BACKEND to "memory" or "supabase".');
}

export function assertSupabaseConfiguration(): void {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase storage requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }
}
