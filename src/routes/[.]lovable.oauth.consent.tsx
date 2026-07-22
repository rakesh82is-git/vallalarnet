import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Local typed wrapper for the beta supabase.auth.oauth namespace.
type OAuthDetails = {
  client?: { name?: string; redirect_uri?: string } | null;
  scopes?: string[] | null;
  redirect_url?: string | null;
  redirect_to?: string | null;
};
type OAuthResult = { redirect_url?: string | null; redirect_to?: string | null };
const oauth = (supabase.auth as unknown as {
  oauth: {
    getAuthorizationDetails: (
      id: string,
    ) => Promise<{ data: OAuthDetails | null; error: { message: string } | null }>;
    approveAuthorization: (
      id: string,
    ) => Promise<{ data: OAuthResult | null; error: { message: string } | null }>;
    denyAuthorization: (
      id: string,
    ) => Promise<{ data: OAuthResult | null; error: { message: string } | null }>;
  };
}).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/login", search: { next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="max-w-md mx-auto px-6 py-20 text-sm">
      Could not load this authorization request: {String((error as Error)?.message ?? error)}
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData() as OAuthDetails | null;
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorization_id)
      : await oauth.denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  const clientName = details?.client?.name ?? "an app";

  return (
    <main className="max-w-md mx-auto px-6 py-16">
      <h1 className="text-2xl font-display font-bold mb-2">
        Connect {clientName} to your account
      </h1>
      <p className="text-sm text-muted-foreground mb-2">
        {clientName} will be able to call this campaign's enabled tools while you are signed in.
      </p>
      <p className="text-xs text-muted-foreground mb-6">
        This does not bypass this app's permissions or backend policies.
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive mb-4">
          {error}
        </p>
      )}
      <div className="flex gap-3">
        <button
          disabled={busy}
          onClick={() => decide(true)}
          className="rounded-full bg-primary text-primary-foreground px-6 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Working…" : "Approve"}
        </button>
        <button
          disabled={busy}
          onClick={() => decide(false)}
          className="rounded-full ring-1 ring-border px-6 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
        >
          Cancel connection
        </button>
      </div>
    </main>
  );
}