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

// Distinct, high-contrast palette used for state/district slices so that many
// sub-regions stay visually separable (no opacity-only shading).
const SUB_COLORS = [
  "hsl(210 80% 52%)",
  "hsl(140 55% 40%)",
  "hsl(32 92% 52%)",
  "hsl(300 50% 55%)",
  "hsl(175 65% 38%)",
  "hsl(0 70% 58%)",
  "hsl(260 60% 60%)",
  "hsl(88 52% 42%)",
  "hsl(48 90% 46%)",
  "hsl(320 60% 55%)",
  "hsl(195 70% 45%)",
  "hsl(12 75% 55%)",
  "hsl(235 55% 58%)",
  "hsl(120 45% 45%)",
  "hsl(60 65% 42%)",
  "hsl(345 65% 52%)",
  "hsl(165 55% 45%)",
  "hsl(275 55% 50%)",
  "hsl(20 85% 48%)",
  "hsl(220 60% 45%)",
];

const sKey = (c: string, s: string) => `${c}|${s}`;
const dKey = (c: string, s: string, d: string) => `${c}|${s}|${d}`;

function AdminAnalytics() {
  const t = useT();
  const { data } = useSuspenseQuery(opts);
  const exportXlsx = useServerFn(adminExportSignaturesXlsx);
  const [exporting, setExporting] = useState(false);

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

  const [countries, setCountries] = useState<Set<string>>(
    () => new Set(geoTree.map((c) => c.country)),
  );
  const [states, setStates] = useState<Set<string>>(() => new Set());
  const [districts, setDistricts] = useState<Set<string>>(() => new Set());
  const [open, setOpen] = useState<Set<string>>(() => new Set());

  function toggleSet(
    set: Set<string>,
    setter: (s: Set<string>) => void,
    keys: string[],
    on: boolean,
  ) {
    const next = new Set(set);
    for (const k of keys) (on ? next.add(k) : next.delete(k));
    setter(next);
  }

  type Slice = { name: string; value: number; fill: string; opacity: number };

  const countryRing: Slice[] = [];
  const stateRing: Slice[] = [];
  const districtRing: Slice[] = [];
  let anyState = false;
  let anyDistrict = false;

  let subIdx = 0;
  const nextSub = () => SUB_COLORS[subIdx++ % SUB_COLORS.length];

  geoTree.forEach((c, i) => {
    if (!countries.has(c.country)) return;
    const fill = RING_COLORS[i % RING_COLORS.length];
    countryRing.push({ name: c.country, value: c.count, fill, opacity: 1 });

    const picked = c.states.filter((s) => states.has(sKey(c.country, s.state)));
    if (picked.length === 0) {
      stateRing.push({ name: c.country, value: c.count, fill, opacity: 0.15 });
      districtRing.push({ name: c.country, value: c.count, fill, opacity: 0.1 });
      return;
    }
    anyState = true;
    const rest = c.count - picked.reduce((a, s) => a + s.count, 0);
    picked.forEach((s) => {
      const sFill = nextSub();
      stateRing.push({ name: `${s.state} · ${c.country}`, value: s.count, fill: sFill, opacity: 1 });
      const dPicked = (s.districts ?? []).filter((d) =>
        districts.has(dKey(c.country, s.state, d.district)),
      );
      if (dPicked.length === 0) {
        districtRing.push({ name: `${s.state} · ${c.country}`, value: s.count, fill: sFill, opacity: 0.18 });
        return;
      }
      anyDistrict = true;
      const dRest = s.count - dPicked.reduce((a, d) => a + d.count, 0);
      dPicked.forEach((d) => {
        districtRing.push({
          name: `${d.district} · ${s.state}`,
          value: d.count,
          fill: nextSub(),
          opacity: 1,
        });
      });
      if (dRest > 0)
        districtRing.push({ name: `Other · ${s.state}`, value: dRest, fill: sFill, opacity: 0.18 });
    });
    if (rest > 0) {
      stateRing.push({ name: `Other · ${c.country}`, value: rest, fill, opacity: 0.15 });
      districtRing.push({ name: `Other · ${c.country}`, value: rest, fill, opacity: 0.1 });
    }
  });

  const rings = [countryRing, anyState ? stateRing : null, anyDistrict ? districtRing : null].filter(
    (r): r is Slice[] => !!r && r.length > 0,
  );

  const RADII = [
    ["0%", "52%"],
    ["56%", "72%"],
    ["76%", "90%"],
  ] as const;

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
        `Exported ${res.digitalCount} digital + ${res.manualCount} manual signatures`,
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
        <div className="mt-5 h-4 rounded-full bg-secondary overflow-hidden flex">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-700"
            style={{ width: `${Math.min(100, (data.digitalTotal / Math.max(data.goal, 1)) * 100)}%` }}
          />
          <div
            className="h-full bg-manual transition-all duration-700"
            style={{ width: `${Math.min(100, (data.manualTotal / Math.max(data.goal, 1)) * 100)}%` }}
          />
        </div>
        <p className="mt-3 font-mono text-sm text-muted-foreground">
          {data.total.toLocaleString("en-IN")} / {data.goal.toLocaleString("en-IN")} · {pct}%
        </p>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          {data.digitalTotal.toLocaleString("en-IN")} digital ·{" "}
          {data.manualTotal.toLocaleString("en-IN")} from {data.manualDocuments.toLocaleString("en-IN")} paper document
          {data.manualDocuments === 1 ? "" : "s"}
        </p>

      </section>

      <section className="rounded-3xl bg-card ring-1 ring-border p-6 md:p-8">
        <h2 className="text-xl font-display font-bold">Signers by geography</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Tick a country to include it; expand it to break it down by state, and a state to break
          it down by district ({geoTotal.toLocaleString("en-IN")} signatures)
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

            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground border-b border-border pb-2">
                <input
                  type="checkbox"
                  checked={geoTree.length > 0 && geoTree.every((c) => countries.has(c.country))}
                  onChange={(e) =>
                    toggleSet(
                      countries,
                      setCountries,
                      geoTree.map((c) => c.country),
                      e.target.checked,
                    )
                  }
                  className="h-4 w-4 accent-[hsl(24_90%_55%)]"
                />
                Select all countries
              </label>
              {geoTree.map((c, i) => {
                const color = RING_COLORS[i % RING_COLORS.length];
                const expanded = open.has(c.country);
                return (
                  <div key={c.country}>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <input
                        type="checkbox"
                        checked={countries.has(c.country)}
                        onChange={(e) =>
                          toggleSet(countries, setCountries, [c.country], e.target.checked)
                        }
                        className="h-4 w-4 accent-[hsl(24_90%_55%)]"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          toggleSet(open, setOpen, [c.country], !expanded)
                        }
                        className="w-4 text-muted-foreground hover:text-foreground"
                        aria-label="Toggle states"
                      >
                        {expanded ? "−" : "+"}
                      </button>
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ background: color }}
                      />
                      <span className="flex-1">{c.country}</span>
                      <span className="font-mono">{c.count.toLocaleString("en-IN")}</span>
                    </div>
                    {expanded && (
                      <ul className="mt-1 pl-6 space-y-1">
                        <li>
                          <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <input
                              type="checkbox"
                              checked={
                                c.states.length > 0 &&
                                c.states.every((s) => states.has(sKey(c.country, s.state)))
                              }
                              onChange={(e) => {
                                toggleSet(
                                  states,
                                  setStates,
                                  c.states.map((s) => sKey(c.country, s.state)),
                                  e.target.checked,
                                );
                                if (e.target.checked)
                                  toggleSet(countries, setCountries, [c.country], true);
                              }}
                              className="h-3.5 w-3.5 accent-[hsl(24_90%_55%)]"
                            />
                            Select all states
                          </label>
                        </li>
                        {c.states.map((s) => {
                          const k = sKey(c.country, s.state);
                          const sOpen = open.has(k);
                          return (
                            <li key={s.state}>
                              <div className="flex items-center gap-2 text-xs">
                                <input
                                  type="checkbox"
                                  checked={states.has(k)}
                                  onChange={(e) =>
                                    {
                                      toggleSet(states, setStates, [k], e.target.checked);
                                      if (e.target.checked)
                                        toggleSet(countries, setCountries, [c.country], true);
                                    }
                                  }
                                  className="h-3.5 w-3.5 accent-[hsl(24_90%_55%)]"
                                />
                                <button
                                  type="button"
                                  onClick={() => toggleSet(open, setOpen, [k], !sOpen)}
                                  className="w-4 text-muted-foreground hover:text-foreground"
                                  aria-label="Toggle districts"
                                >
                                  {(s.districts ?? []).length ? (sOpen ? "−" : "+") : ""}
                                </button>
                                <span className="flex-1">{s.state}</span>
                                <span className="font-mono text-muted-foreground">
                                  {s.count.toLocaleString("en-IN")}
                                </span>
                              </div>
                              {sOpen && (
                                <ul className="pl-6 mt-0.5 space-y-0.5">
                                  <li>
                                    <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                      <input
                                        type="checkbox"
                                        checked={
                                          (s.districts ?? []).length > 0 &&
                                          (s.districts ?? []).every((d) =>
                                            districts.has(dKey(c.country, s.state, d.district)),
                                          )
                                        }
                                        onChange={(e) => {
                                          toggleSet(
                                            districts,
                                            setDistricts,
                                            (s.districts ?? []).map((d) =>
                                              dKey(c.country, s.state, d.district),
                                            ),
                                            e.target.checked,
                                          );
                                          if (e.target.checked) {
                                            toggleSet(states, setStates, [k], true);
                                            toggleSet(countries, setCountries, [c.country], true);
                                          }
                                        }}
                                        className="h-3 w-3 accent-[hsl(24_90%_55%)]"
                                      />
                                      Select all districts
                                    </label>
                                  </li>
                                  {(s.districts ?? []).map((d) => {
                                    const dk = dKey(c.country, s.state, d.district);
                                    return (
                                      <li
                                        key={d.district}
                                        className="flex items-center gap-2 text-[11px]"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={districts.has(dk)}
                                          onChange={(e) =>
                                            {
                                              toggleSet(
                                                districts,
                                                setDistricts,
                                                [dk],
                                                e.target.checked,
                                              );
                                              if (e.target.checked) {
                                                toggleSet(states, setStates, [k], true);
                                                toggleSet(
                                                  countries,
                                                  setCountries,
                                                  [c.country],
                                                  true,
                                                );
                                              }
                                            }
                                          }
                                          className="h-3 w-3 accent-[hsl(24_90%_55%)]"
                                        />
                                        <span className="flex-1">{d.district}</span>
                                        <span className="font-mono text-muted-foreground/80">
                                          {d.count.toLocaleString("en-IN")}
                                        </span>
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}