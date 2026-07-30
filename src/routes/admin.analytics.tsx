import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { getStats } from "@/lib/petition.functions";
import { adminExportSignaturesXlsx } from "@/lib/admin.functions";
import { useT } from "@/i18n/context";
import { toast } from "sonner";

const opts = queryOptions({ queryKey: ["admin", "stats", "full"], queryFn: () => getStats() });

export const Route = createFileRoute("/admin/analytics")({
  component: AdminAnalytics,
});

const RING_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(24 90% 55%)",
  "hsl(160 60% 40%)",
  "hsl(280 55% 55%)",
  "hsl(200 70% 45%)",
  "hsl(45 90% 50%)",
  "hsl(0 65% 55%)",
];

function AdminAnalytics() {
  const t = useT();
  const { data } = useSuspenseQuery(opts);
  const exportXlsx = useServerFn(adminExportSignaturesXlsx);
  const [exporting, setExporting] = useState(false);

  const pct = Math.min(100, Math.round((data.total / data.goal) * 100));
  const geoTree = data.geoTree ?? [];
  const geoTotal = geoTree.reduce((a, c) => a + c.count, 0);
  const inner = geoTree.map((c, i) => ({
    name: c.country,
    value: c.count,
    fill: RING_COLORS[i % RING_COLORS.length],
  }));
  const outer = geoTree.flatMap((c, i) =>
    c.states.map((s, j) => ({
      name: `${s.state} · ${c.country}`,
      value: s.count,
      fill: RING_COLORS[i % RING_COLORS.length],
      opacity: Math.max(0.35, 1 - j * 0.14),
    })),
  );

  async function handleExport() {
    setExporting(true);
    try {
      const res = await exportXlsx();
      const bin = atob(res.base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(
        `Exported ${res.digitalCount} digital + ${res.manualCount} manual`,
      );
    } catch (e) {
      console.error(e);
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-display font-bold">Analytics</h1>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {exporting ? "Preparing…" : "Download signatures (Excel)"}
        </button>
      </div>
      <p className="text-xs text-muted-foreground -mt-4">
        Excel workbook with two sheets — Digital Signatures (with embedded signature images) and Manual Documents (with embedded document images, or a link when the file is a PDF). Excludes unmasked phone numbers.
      </p>

      <section className="rounded-3xl bg-card ring-1 ring-border p-6 md:p-8">
        <h2 className="text-xl font-display font-bold">{t.analytics.goalTitle}</h2>
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

      <section className="rounded-3xl bg-card ring-1 ring-border p-6 md:p-8">
        <h2 className="text-xl font-display font-bold">Signers by country and state</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Inner ring: country · outer ring: state ({geoTotal.toLocaleString("en-IN")} signatures)
        </p>
        {geoTree.length === 0 ? (
          <p className="text-sm text-muted-foreground italic mt-4">{t.analytics.worldEmpty}</p>
        ) : (
          <div className="mt-4 grid lg:grid-cols-[1.3fr_1fr] gap-6 items-center">
            <div className="h-[420px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `${value.toLocaleString("en-IN")} (${geoTotal ? Math.round((value / geoTotal) * 100) : 0}%)`,
                      name,
                    ]}
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Legend verticalAlign="bottom" height={24} iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Pie
                    data={inner}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="47%"
                    outerRadius="52%"
                    isAnimationActive={false}
                    label={({ name, value }) => `${name} (${value})`}
                    labelLine={false}
                    stroke="hsl(var(--card))"
                    strokeWidth={2}
                  >
                    {inner.map((d, i) => (
                      <Cell key={i} fill={d.fill} />
                    ))}
                  </Pie>
                  <Pie
                    data={outer}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="47%"
                    innerRadius="56%"
                    outerRadius="76%"
                    isAnimationActive={false}
                    label={({ name, value }) => `${String(name).split(" · ")[0]} (${value})`}
                    labelLine={{ stroke: "hsl(var(--border))" }}
                    stroke="hsl(var(--card))"
                    strokeWidth={1}
                  >
                    {outer.map((d, i) => (
                      <Cell key={i} fill={d.fill} fillOpacity={d.opacity} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
              {geoTree.map((c, i) => (
                <div key={c.country}>
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ background: RING_COLORS[i % RING_COLORS.length] }}
                      />
                      {c.country}
                    </span>
                    <span className="font-mono">{c.count.toLocaleString("en-IN")}</span>
                  </div>
                  <ul className="mt-1 pl-5 space-y-0.5">
                    {c.states.map((s) => (
                      <li key={s.state} className="flex justify-between text-xs text-muted-foreground font-mono">
                        <span>{s.state}</span>
                        <span>{s.count.toLocaleString("en-IN")}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}