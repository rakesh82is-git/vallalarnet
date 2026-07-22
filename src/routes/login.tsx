import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s.next === "string" ? s.next : "",
  }),
  head: () => ({
    meta: [
      { title: "Sign in — Vadalur Punitha Nagaram" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: LoginPage,
});

function safeNext(next: string): string {
  // same-origin relative path only
  if (!next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

function LoginPage() {
  const { next } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const target = safeNext(next);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive && data.session) window.location.href = target;
    });
    return () => {
      alive = false;
    };
  }, [target]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = target;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${target}`,
          },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Auth failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="max-w-md mx-auto px-6 py-16">
      <h1 className="text-2xl font-display font-bold mb-2">
        {mode === "signin" ? "Sign in" : "Create an account"}
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        Sign in to authorize an app to connect to the campaign.
      </p>
      <form onSubmit={submit} className="space-y-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          autoComplete="email"
          className="w-full rounded-xl ring-1 ring-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          className="w-full rounded-xl ring-1 ring-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-primary text-primary-foreground py-3 text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>
      <button
        type="button"
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        className="mt-4 text-xs text-muted-foreground hover:text-foreground"
      >
        {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
      </button>
    </main>
  );
}