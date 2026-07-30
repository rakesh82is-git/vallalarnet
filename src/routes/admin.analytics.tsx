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
  "hsl(24 90% 55%)",
  "hsl(200 75% 48%)",
  "hsl(160 60% 42%)",
  "hsl(280 55% 58%)",
  "hsl(45 92% 50%)",
  "hsl(340 70% 58%)",
  "hsl(95 50% 45%)",
  "hsl(15 80% 60%)",
  "hsl(255 60% 62%)",
  "hsl(185 65% 42%)",
];

type Level = "country" | "state" | "district";

function AdminAnalytics() {
  const t = useT();
  const { data } = useSuspenseQuery(opts);
  const exportXlsx = useServerFn(adminExportSignaturesXlsx);
  const [exporting, setExporting] = useState(false);
  const [levels, setLevels] = useState<Record<Level, boolean>>({
    country: true,
    state: false,
    district: false,
  });

  const pct = Math.min(100, Math.round((data.total / data.goal) * 100));
  const geoTree = (data.geoTree ?? []) as Array<{
    country: string;
    count: number;
    states: Array<{
      state: string;
      count: number;
      districts?: Array<{ district: string; count: number }>;
    }>;
  }>;
  const geoTotal = geoTree.reduce((a, c) => a + c.count, 0);

  const countryRing = geoTree.map((c, i) => ({
    name: c.country,
    value: c.count,
    fill: RING_COLORS[i % RING_COLORS.length],
    opacity: 1,
  }));
  const stateRing = geoTree.flatMap((c, i) =>
    c.states.map((s, j) => ({
      name: `${s.state} · ${c.country}`,
      short: s.state,
      value: s.count,
      fill: RING_COLORS[i % RING_COLORS.length],
      opacity: Math.max(0.4, 1 - j * 0.14),
    })),
  );
  const districtRing = geoTree.flatMap((c, i) =>
    c.states.flatMap((s) =>
      (s.districts ?? []).map((d, k) => ({
        name: `${d.district} · ${s.state}`,
        short: d.district,
        value: d.count,
        fill: RING_COLORS[i % RING_COLORS.length],
        opacity: Math.max(0.3, 0.9 - k * 0.1),
      })),
    ),
  );

  const rings = (
    [
      levels.country ? countryRing : null,
      levels.state ? stateRing : null,
      levels.district ? districtRing : null,
    ].filter(Boolean) as Array<
      Array<{ name: string; short?: string; value: number; fill: string; opacity: number }>
    >
  ).filter((r) => r.length > 0);

  const RADII = [
    ["0%", "52%"],
    ["56%", "72%"],
    ["76%", "90%"],
  ] as const;

  function toggle(level: Level) {
    setLevels((prev) => {
      const next = { ...prev, [level]: !prev[level] };
      if (!next.country && !next.state && !next.district) return prev;
      return next;
    });
  }

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
        <h2 className="text-xl font-display font-bold">Signers by geography</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Pick the levels to display ({geoTotal.toLocaleString("en-IN")} signatures)
        </p>
        <div className="mt-4 flex flex-wrap gap-4">
          {(["country", "state", "district"] as Level[]).map((lv) => (
            <label
              key={lv}
              className="flex items-center gap-2 text-sm capitalize cursor-pointer select-none rounded-full ring-1 ring-border px-4 py-1.5 hover:bg-secondary/60"
            >
              <input
                type="checkbox"
                checked={levels[lv]}
                onChange={() => toggle(lv)}
                className="h-4 w-4 accent-[hsl(24_90%_55%)]"
              />
              {lv}
            </label>
          ))}
        </div>
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
                  {rings.map((ring, idx) => (
                    <Pie
                      key={idx}
                      data={ring}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="47%"
                      innerRadius={RADII[idx][0]}
                      outerRadius={RADII[idx][1]}
                      isAnimationActive={false}
                      label={({ name, value }: { name: string; value: number }) =>
                        `${String(name).split(" · ")[0]} (${value})`
                      }
                      labelLine={idx === 0 ? false : { stroke: "hsl(var(--border))" }}
                      stroke="hsl(var(--card))"
                      strokeWidth={idx === 0 ? 2 : 1}
                    >
                      {ring.map((d, i) => (
                        <Cell key={i} fill={d.fill} fillOpacity={d.opacity} />
                      ))}
                    </Pie>
                  ))}
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
                      <li key={s.state}>
                        <div className="flex justify-between text-xs text-muted-foreground font-mono">
                          <span>{s.state}</span>
                          <span>{s.count.toLocaleString("en-IN")}</span>
                        </div>
                        {levels.district && (
                          <ul className="pl-4">
                            {(s.districts ?? []).map((d) => (
                              <li
                                key={d.district}
                                className="flex justify-between text-[11px] text-muted-foreground/80 font-mono"
                              >
                                <span>{d.district}</span>
                                <span>{d.count.toLocaleString("en-IN")}</span>
                              </li>
                            ))}
                          </ul>
                        )}
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