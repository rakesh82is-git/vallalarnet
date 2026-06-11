import { createFileRoute, Link } from "@tanstack/react-router";
import { useT } from "@/i18n/context";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getStats } from "@/lib/petition.functions";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const opts = queryOptions({ queryKey: ["stats", "full"], queryFn: () => getStats() });

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Vadalur Holy City" },
      { name: "description", content: "Live progress toward 1,00,000 signatures for declaring Vadalur a Holy City." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  component: AnalyticsPage,
});

function timeAgo(iso: string) {
  const t = new Date(iso).getTime();
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function AnalyticsPage() {
  const t = useT();
  const { data } = useSuspenseQuery(opts);
  const pct = Math.min(100, Math.round((data.total / data.goal) * 100));
  const maxRegion = data.regions[0]?.count ?? 1;

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 space-y-10">
      {/* Goal */}
      <section className="rounded-3xl bg-card ring-1 ring-border p-6 md:p-8">
        <h2 className="text-2xl font-display font-bold">{t.analytics.goalTitle}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t.analytics.goalSub}</p>
        <div className="mt-5 h-4 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-700"
            style={{ width: `${Math.max(pct, 1)}%` }}
          />
        </div>
        <p className="mt-3 font-mono text-sm text-muted-foreground">
          {data.total.toLocaleString("en-IN")} / {data.goal.toLocaleString("en-IN")} · {pct}%
        </p>
      </section>

      {/* Growth */}
      <section className="rounded-3xl bg-card ring-1 ring-border p-6 md:p-8">
        <h2 className="text-xl font-display font-bold mb-4">{t.analytics.growthTitle}</h2>
        {data.series.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">{t.analytics.growthEmpty}</p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.series}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Line type="monotone" dataKey="cumulative" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent */}
        <section className="rounded-3xl bg-card ring-1 ring-border p-6">
          <h2 className="text-xl font-display font-bold mb-4">{t.analytics.recentTitle}</h2>
          {data.recent.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">{t.wall.empty}</p>
          ) : (
            <ul className="space-y-3">
              {data.recent.map((r, i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-semibold">{r.name}</span>
                    <span className="text-muted-foreground"> · {r.district}, {r.state}</span>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">{timeAgo(r.created_at as string)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Region split */}
        <section className="rounded-3xl bg-card ring-1 ring-border p-6">
          <h2 className="text-xl font-display font-bold mb-4">{t.analytics.regionTitle}</h2>
          {data.regions.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">—</p>
          ) : (
            <ul className="space-y-3">
              {data.regions.map((r, i) => (
                <li key={i}>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span>{r.label}</span>
                    <span className="text-muted-foreground">{r.count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-primary/70"
                      style={{ width: `${Math.round((r.count / maxRegion) * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* World list */}
      <section className="rounded-3xl bg-card ring-1 ring-border p-6">
        <h2 className="text-xl font-display font-bold mb-4">{t.analytics.worldTitle}</h2>
        {data.countryList.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">{t.analytics.worldEmpty}</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {data.countryList.map((c, i) => (
              <div key={i} className="rounded-xl bg-secondary/40 px-4 py-3 flex justify-between text-sm">
                <span className="font-medium">{c.label}</span>
                <span className="font-mono text-muted-foreground">{c.count}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="text-center">
        <Link
          to="/sign"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-medium hover:opacity-90"
        >
          ✎ {t.wall.sign}
        </Link>
      </div>
    </div>
  );
}