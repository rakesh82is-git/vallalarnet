import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";

export default defineTool({
  name: "get_signature_count",
  title: "Get petition signature count",
  description:
    "Return the current number of signatures collected for the Vadalur Punitha Nagaram petition, and the campaign target.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async () => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { count, error } = await supabase
      .from("signatures")
      .select("*", { count: "exact", head: true });
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    const target = 100000;
    const current = count ?? 0;
    return {
      content: [
        {
          type: "text",
          text: `Signatures: ${current.toLocaleString()} of ${target.toLocaleString()} target (${(
            (current / target) *
            100
          ).toFixed(2)}%).`,
        },
      ],
      structuredContent: { count: current, target, percent: (current / target) * 100 },
    };
  },
});