import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "list_campaign_updates",
  title: "List recent campaign updates",
  description:
    "Return the most recent published campaign updates (title, date, content, media URL). Bilingual English + Tamil.",
  inputSchema: {
    limit: z
      .number()
      .int()
      .min(1)
      .max(20)
      .default(5)
      .describe("How many updates to return. Default 5, max 20."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }) => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data, error } = await supabase
      .from("campaign_updates")
      .select("id, title_en, title_ta, content_en, content_ta, media_url, external_url, created_at, is_pinned, status")
      .eq("status", "published")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    const items = data ?? [];
    return {
      content: [{ type: "text", text: JSON.stringify(items, null, 2) }],
      structuredContent: { updates: items },
    };
  },
});