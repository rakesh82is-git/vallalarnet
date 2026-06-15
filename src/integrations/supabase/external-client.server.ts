// External Supabase admin client for project efaplbqcdodswcntoesj.
// Lovable Cloud is connected to a different project (aiumubanfzlylktgctmr) and
// cannot be repointed; this client is what the app actually uses for data.
// SERVER-ONLY. Load inside server-fn handlers via dynamic import.
import { createClient } from "@supabase/supabase-js";

const EXTERNAL_SUPABASE_URL = "https://efaplbqcdodswcntoesj.supabase.co";

function createExternalAdminClient() {
  const key =
    process.env.EXTERNAL_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY;

  if (!key) {
    const supabaseEnvKeys = Object.keys(process.env)
      .filter((k) => k.includes("SUPABASE"))
      .sort();

    console.error("[external backend] Supabase service-role key is not available at runtime.", {
      expectedOneOf: [
        "EXTERNAL_SUPABASE_SERVICE_ROLE_KEY",
        "SUPABASE_SERVICE_ROLE_KEY",
        "SUPABASE_SECRET_KEY",
      ],
      hasExternalServiceRole: Boolean(process.env.EXTERNAL_SUPABASE_SERVICE_ROLE_KEY),
      hasSupabaseServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      hasSupabaseSecretKey: Boolean(process.env.SUPABASE_SECRET_KEY),
      hasSupabaseUrl: Boolean(process.env.SUPABASE_URL),
      detectedSupabaseEnvKeys: supabaseEnvKeys,
    });
    return null;
  }

  return createClient(EXTERNAL_SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });
}

let _client: ReturnType<typeof createExternalAdminClient> | undefined;

export function getExternalSupabaseAdmin() {
  if (_client === undefined) {
    const created = createExternalAdminClient();
    if (created) _client = created;
    return created;
  }
  return _client;
}