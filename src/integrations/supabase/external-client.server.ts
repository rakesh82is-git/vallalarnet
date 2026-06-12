// External Supabase admin client for project efaplbqcdodswcntoesj.
// Lovable Cloud is connected to a different project (aiumubanfzlylktgctmr) and
// cannot be repointed; this client is what the app actually uses for data.
// SERVER-ONLY. Load inside server-fn handlers via dynamic import.
import { createClient } from "@supabase/supabase-js";

const EXTERNAL_SUPABASE_URL = "https://efaplbqcdodswcntoesj.supabase.co";

function createExternalAdminClient() {
  const key = process.env.EXTERNAL_SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    console.warn("[external backend] EXTERNAL_SUPABASE_SERVICE_ROLE_KEY is not available at runtime.");
    return null;
  }
  return createClient(EXTERNAL_SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });
}

let _client: ReturnType<typeof createExternalAdminClient> | undefined;

export function getExternalSupabaseAdmin() {
  if (_client === undefined) _client = createExternalAdminClient();
  return _client;
}