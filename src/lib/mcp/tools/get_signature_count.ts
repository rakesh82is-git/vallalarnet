import { defineTool } from "@lovable.dev/mcp-js";

export default defineTool({
  name: "get_signature_count",
  title: "Get petition signature count",
  description:
    "Return the current number of signatures collected for the Vadalur Punitha Nagaram petition, and the campaign target.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count, error } = await supabaseAdmin
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