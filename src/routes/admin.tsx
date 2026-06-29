import { createFileRoute, Link, Outlet, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminCheck, adminLogin, adminLogout } from "@/lib/admin.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Vadalur" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  const router = useRouter();
  const check = useServerFn(adminCheck);
  const login = useServerFn(adminLogin);
  const logout = useServerFn(adminLogout);

  const [status, setStatus] = useState<"loading" | "in" | "out">("loading");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let alive = true;
    check()
      .then((r) => alive && setStatus(r.authed ? "in" : "out"))
      .catch(() => alive && setStatus("out"));
    return () => {
      alive = false;
    };
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password) return;
    setSubmitting(true);
    try {
      const r = await login({ data: { username, password } });
      if (r.ok) {
        setStatus("in");
        setPassword("");
        setUsername("");
        toast.success("Welcome, admin");
      } else {
        toast.error("Wrong username or password");
      }
    } catch {
      toast.error("Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    try {
      await logout();
    } finally {
      setStatus("out");
      router.navigate({ to: "/admin" });
    }
  }

  if (status === "loading") {
    return (
      <div className="max-w-md mx-auto px-6 py-24 text-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (status === "out") {
    return (
      <div className="max-w-md mx-auto px-6 py-20">
        <h1 className="text-2xl font-display font-bold mb-2">Admin sign-in</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Enter the admin credentials to manage analytics and gallery content.
        </p>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            autoFocus
            autoComplete="username"
            className="w-full rounded-xl ring-1 ring-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            className="w-full rounded-xl ring-1 ring-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-primary text-primary-foreground py-3 text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 border-b border-border pb-4">
        <div className="flex items-center gap-4 text-sm font-medium">
          <Link
            to="/admin"
            activeOptions={{ exact: true }}
            activeProps={{ className: "text-primary" }}
            className="hover:text-primary"
          >
            Admin
          </Link>
          <Link
            to="/admin/analytics"
            activeProps={{ className: "text-primary" }}
            className="hover:text-primary"
          >
            Analytics
          </Link>
          <Link
            to="/admin/gallery"
            activeProps={{ className: "text-primary" }}
            className="hover:text-primary"
          >
            Gallery
          </Link>
          <Link
            to="/admin/updates"
            activeProps={{ className: "text-primary" }}
            className="hover:text-primary"
          >
            Updates
          </Link>
          <Link
            to="/admin/manual"
            activeProps={{ className: "text-primary" }}
            className="hover:text-primary"
          >
            Manual Upload
          </Link>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          Sign out
        </button>
      </div>
      <Outlet />
    </div>
  );
}