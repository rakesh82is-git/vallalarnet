// External Supabase admin client for project efaplbqcdodswcntoesj.
// Lovable Cloud is connected to a different project (aiumubanfzlylktgctmr) and
// cannot be repointed; this client is what the app actually uses for data.
// SERVER-ONLY. Load inside server-fn handlers via dynamic import.
import { createClient } from "@supabase/supabase-js";

const EXTERNAL_SUPABASE_URL = "https://efaplbqcdodswcntoesj.supabase.co";

function createExternalAdminClient() {
  const key = process.env.EXTERNAL_SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "Missing EXTERNAL_SUPABASE_SERVICE_ROLE_KEY. Add it via Lovable secrets.",
    );
  }
  return createClient(EXTERNAL_SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });
}

let _client: ReturnType<typeof createExternalAdminClient> | undefined;

export const externalSupabaseAdmin = new Proxy(
  {} as ReturnType<typeof createExternalAdminClient>,
  {
    get(_, prop, receiver) {
      if (!_client) _client = createExternalAdminClient();
      return Reflect.get(_client, prop, receiver);
    },
  },
);