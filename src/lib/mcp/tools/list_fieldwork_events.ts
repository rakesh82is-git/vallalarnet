import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "list_fieldwork_events",
  title: "List fieldwork events",
  description:
    "Return campaign fieldwork events with title, caption, date, and location. Bilingual English + Tamil.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).default(10).describe("Max events to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }) => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data, error } = await supabase
      .from("fieldwork_events")
      .select("id, title_en, title_ta, caption_en, caption_ta, event_date, location, sort_order")
      .order("sort_order", { ascending: true })
      .order("event_date", { ascending: false })
      .limit(limit);
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { events: data ?? [] },
    };
  },
});