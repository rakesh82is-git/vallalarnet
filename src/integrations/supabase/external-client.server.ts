// Server-only client pointing to the external Supabase project
// (efaplbqcdodswcntoesj) where signatures must be stored.
// Uses the service role key from EXTERNAL_SUPABASE_SERVICE_ROLE_KEY secret.
import { createClient } from '@supabase/supabase-js';

const EXTERNAL_SUPABASE_URL = 'https://efaplbqcdodswcntoesj.supabase.co';

function createExternalAdmin() {
  const key =
    process.env.EXTERNAL_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "missing-external-service-role-key";
  if (!key) {
    throw new Error('External petition database is not configured.');
  }
  return createClient(EXTERNAL_SUPABASE_URL, key, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

let _client: ReturnType<typeof createExternalAdmin> | undefined;

export const externalSupabaseAdmin = new Proxy(
  {} as ReturnType<typeof createExternalAdmin>,
  {
    get(_, prop, receiver) {
      if (!_client) _client = createExternalAdmin();
      return Reflect.get(_client, prop, receiver);
    },
  },
);