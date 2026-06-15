import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/")({
  component: AdminHome,
});

function AdminHome() {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <Link
        to="/admin/analytics"
        className="rounded-3xl bg-card ring-1 ring-border p-6 hover:ring-primary/60 transition"
      >
        <p className="text-xs font-mono uppercase tracking-widest text-accent">01</p>
        <h2 className="mt-2 text-xl font-display font-bold">Analytics</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Live progress, growth, region split, and CSV export of all signatures.
        </p>
      </Link>
      <Link
        to="/admin/gallery"
        className="rounded-3xl bg-card ring-1 ring-border p-6 hover:ring-primary/60 transition"
      >
        <p className="text-xs font-mono uppercase tracking-widest text-accent">02</p>
        <h2 className="mt-2 text-xl font-display font-bold">Gallery Management</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Add, edit and remove photos, videos and fieldwork entries.
        </p>
      </Link>
    </div>
  );
}