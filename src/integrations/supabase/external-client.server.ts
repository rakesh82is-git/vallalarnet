// The petition database is now the primary Lovable Cloud project
// (efaplbqcdodswcntoesj). This file re-exports the main admin client so
// existing callers keep working without changes.
export { supabaseAdmin as externalSupabaseAdmin } from './client.server';