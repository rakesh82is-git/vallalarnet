import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getSignatureCount from "./tools/get_signature_count";
import listCampaignUpdates from "./tools/list_campaign_updates";
import listFieldworkEvents from "./tools/list_fieldwork_events";

// Direct Supabase issuer — do NOT use the .lovable.cloud proxy.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "vadalur-punitha-nagaram-mcp",
  title: "Vadalur Punitha Nagaram",
  version: "0.1.0",
  instructions:
    "Tools for the 'Declare Vadalur a Holy City' petition campaign. Use `get_signature_count` for the live signature total, `list_campaign_updates` for recent news posts, and `list_fieldwork_events` for on-the-ground campaign events. All responses include English + Tamil where available.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getSignatureCount, listCampaignUpdates, listFieldworkEvents],
});