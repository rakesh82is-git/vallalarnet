import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import lampImg from "@/assets/vallalar_study.jpeg";
import sanctuaryImg from "@/assets/vallalar_with_animals_1.jpeg";
import { useT } from "@/i18n/context";
import { RichText } from "@/components/rich-text";
import { getStats, listSignatures } from "@/lib/petition.functions";

const statsOpts = queryOptions({
  queryKey: ["stats"],
  queryFn: () => getStats(),
});
const recentOpts = queryOptions({
  queryKey: ["recent-wall"],
  queryFn: () => listSignatures({ data: { limit: 6 } }),
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vadalur — Declare a Holy City" },
      { name: "description", content: "Global petition honouring Vallalar's sacred land and the Sathya Gnana Sabha. Sign to declare Vadalur a Holy City." },
      { property: "og:title", content: "Vadalur — Declare a Holy City" },
      { property: "og:description", content: "Every signature is a prayer for Vadalur." },
      { property: "og:image", content: sanctuaryImg },
    ],
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(statsOpts),
      context.queryClient.ensureQueryData(recentOpts),
    ]);
  },
  component: Index,
});

function Index() {
  const t = useT();
  const { data: stats } = useSuspenseQuery(statsOpts);
  const { data: recent } = useSuspenseQuery(recentOpts);
  const pct = Math.min(100, Math.round((stats.total / stats.goal) * 100));

  return (
    <>
      {/* HERO */}
      <header className="relative overflow-hidden pt-10 md:pt-16 pb-12 px-6">
        <div className="absolute top-32 left-1/2 size-[680px] -translate-x-1/2 rounded-full bg-accent/25 blur-[140px] animate-glow pointer-events-none" />
        <div className="relative max-w-6xl mx-auto">
          <p className="text-center text-xs font-mono uppercase tracking-[0.3em] text-accent mb-5">
            ── {t.home.eyebrow.map((line, i) => (
              <span key={i}>
                {line}
                {i < t.home.eyebrow.length - 1 && <br />}
              </span>
            ))} ──
          </p>
          <div className="relative aspect-[16/7] rounded-3xl overflow-hidden ring-1 ring-border shadow-2xl shadow-primary/10 mb-10 animate-reveal">
            <img
              src={sanctuaryImg}
              alt="Vallalar with all beings outside the Sathya Gnana Sabha"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/30 via-transparent to-transparent" />
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-bold text-center text-balance leading-[1.1] animate-reveal">
            {t.home.title1}
            <br />
            <span className="text-primary">{t.home.title2}</span>
            <br />
            {t.home.title3}
          </h1>
          <p className="mt-3 text-center text-lg md:text-xl italic text-accent font-medium max-w-2xl mx-auto">
            {t.home.titleQuote}
          </p>
          <p className="mt-6 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto text-center whitespace-pre-line">
            <RichText text={t.home.lede} />
          </p>
          <div className="mt-8 flex flex-wrap gap-3 items-center justify-center">
            <Link
              to="/sign"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
            >
              ✎ {t.home.ctaSign}
            </Link>
            <Link
              to="/story"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full ring-1 ring-border bg-card hover:bg-secondary transition-colors"
            >
              {t.home.ctaStory}
            </Link>
          </div>
          <div className="mt-6 text-center text-sm font-mono text-muted-foreground">
            <span className="text-foreground font-semibold">{stats.total.toLocaleString("en-IN")}</span> {t.home.counterSign}
            <span className="mx-2">·</span>
            <span className="text-foreground font-semibold">{stats.districts}</span> {t.home.counterPlaces}
            <span className="mx-2">·</span>
            <span className="text-foreground font-semibold">{stats.countries}</span> {t.home.counterCountries}
          </div>
        </div>
      </header>

      {/* WHY */}
      <section className="max-w-4xl mx-auto px-6 py-16 text-center">
        <p className="text-xs font-mono uppercase tracking-[0.3em] text-accent">── {t.home.whyEyebrow} ──</p>
        <h2 className="mt-3 text-3xl md:text-4xl font-display font-bold">{t.home.whyTitle}</h2>
        <p className="mt-5 text-lg text-muted-foreground leading-relaxed">{t.home.whyBody}</p>
        <Link to="/story" className="mt-6 inline-block text-primary font-medium hover:underline">
          {t.home.readMore}
        </Link>
      </section>

      {/* GOAL */}
      <section className="px-6 py-12">
        <div className="max-w-3xl mx-auto rounded-3xl bg-card ring-1 ring-border p-8">
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-accent text-center">── {t.home.goalEyebrow} ──</p>
          <h3 className="mt-2 text-2xl font-display font-bold text-center">{t.home.goalTitle}</h3>
          <div className="mt-6 h-3 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-700"
              style={{ width: `${Math.max(pct, 1)}%` }}
            />
          </div>
          <p className="mt-3 text-center font-mono text-sm text-muted-foreground">
            {stats.total.toLocaleString("en-IN")} / {stats.goal.toLocaleString("en-IN")} · {pct}%
          </p>
        </div>
      </section>

      {/* VOICES */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.3em] text-accent">── {t.home.voicesEyebrow} ──</p>
            <h2 className="mt-2 text-2xl md:text-3xl font-display font-bold">{t.home.voicesTitle}</h2>
          </div>
          <Link to="/wall" className="text-primary text-sm font-medium hover:underline">
            {t.home.voicesView}
          </Link>
        </div>
        {recent.items.length === 0 ? (
          <p className="text-muted-foreground italic">{t.home.voicesEmpty}</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recent.items.slice(0, 6).map((s) => (
              <div key={s.id} className="rounded-2xl bg-card ring-1 ring-border p-5">
                <p className="text-sm text-foreground leading-relaxed line-clamp-3">
                  {s.message || "✦"}
                </p>
                <div className="mt-4 text-xs font-mono text-muted-foreground">
                  {s.name} · {s.district}, {s.country}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <p className="text-center text-xs font-mono uppercase tracking-[0.3em] text-accent">── {t.home.stepsEyebrow} ──</p>
        <h2 className="mt-2 text-3xl md:text-4xl font-display font-bold text-center">{t.home.stepsTitle}</h2>
        <div className="mt-10 grid md:grid-cols-3 gap-6">
          {[
            { n: "01", title: t.home.step1Title, body: t.home.step1Body },
            { n: "02", title: t.home.step2Title, body: t.home.step2Body },
            { n: "03", title: t.home.step3Title, body: t.home.step3Body },
          ].map((s) => (
            <div key={s.n} className="rounded-2xl bg-card ring-1 ring-border p-6">
              <span className="font-mono text-xs text-accent">{s.n}</span>
              <h3 className="mt-3 text-xl font-display font-bold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="px-6 pb-16">
        <div className="max-w-6xl mx-auto relative w-full h-[320px] md:h-[420px] rounded-3xl overflow-hidden">
          <img src={lampImg} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/85 via-background/30 to-transparent" />
          <div className="absolute inset-0 flex flex-col items-center justify-end text-center px-6 pb-10">
            <p className="text-xs font-mono uppercase tracking-[0.3em] text-accent">── {t.home.finalEyebrow} ──</p>
            <h2 className="mt-2 text-3xl md:text-4xl font-display font-bold">{t.home.finalTitle}</h2>
            <p className="mt-3 text-muted-foreground max-w-xl">{t.home.finalBody}</p>
            <Link
              to="/sign"
              className="mt-6 inline-flex items-center gap-2 px-7 py-3 rounded-full bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
            >
              ✎ {t.home.ctaSign}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
