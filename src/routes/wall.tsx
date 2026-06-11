import { createFileRoute, Link } from "@tanstack/react-router";
import { useT } from "@/i18n/context";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { listSignatures } from "@/lib/petition.functions";

const wallOpts = queryOptions({
  queryKey: ["wall", "all"],
  queryFn: () => listSignatures({ data: { limit: 60 } }),
});

export const Route = createFileRoute("/wall")({
  head: () => ({
    meta: [
      { title: "Signature Wall — Vadalur Holy City" },
      { name: "description", content: "Every signature is a prayer for Vadalur. Read voices from across the world." },
      { property: "og:title", content: "Vadalur Signature Wall" },
      { property: "og:description", content: "Voices from across the world supporting Vadalur as a Holy City." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(wallOpts),
  component: WallPage,
});

function WallPage() {
  const t = useT();
  const { data } = useSuspenseQuery(wallOpts);

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="text-center mb-10 animate-reveal">
        <p className="text-xs font-mono uppercase tracking-[0.3em] text-accent">── {t.nav.wall} ──</p>
        <h1 className="mt-3 text-3xl md:text-5xl font-display font-bold">{t.wall.title}</h1>
        <p className="mt-3 text-muted-foreground">{t.wall.lede}</p>
      </div>

      {data.items.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground italic">{t.wall.empty}</p>
          <Link
            to="/sign"
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-medium hover:opacity-90"
          >
            ✎ {t.wall.sign}
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.items.map((s, i) => (
            <article
              key={s.id}
              className="rounded-2xl bg-card ring-1 ring-border p-5 animate-reveal"
              style={{ animationDelay: `${(i % 12) * 40}ms` }}
            >
              {s.signature_svg ? (
                <div className="aspect-[3/1] rounded-lg bg-secondary/40 overflow-hidden mb-3 flex items-center justify-center">
                  <img src={s.signature_svg} alt="" className="max-h-full max-w-full object-contain" />
                </div>
              ) : s.scan_url ? (
                <div className="aspect-[3/2] rounded-lg bg-secondary/40 overflow-hidden mb-3">
                  <img src={s.scan_url} alt="" className="w-full h-full object-cover" />
                </div>
              ) : null}
              {s.message && (
                <p className="text-sm text-foreground leading-relaxed line-clamp-3">"{s.message}"</p>
              )}
              <div className="mt-4 flex items-baseline justify-between gap-2 text-xs font-mono text-muted-foreground">
                <span className="font-semibold text-foreground">{s.name}</span>
                <span>{s.district}, {s.country}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}