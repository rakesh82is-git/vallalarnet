import { createFileRoute, Link } from "@tanstack/react-router";
import { useT } from "@/i18n/context";
import sanctuaryImg from "@/assets/gnana_sabai_over.jpeg";
import lampImg from "@/assets/vallalar_study.jpeg";
import gatheringImg from "@/assets/gnana_sabai_over.jpeg";
import thanksImg from "@/assets/vallalar_with_animals_2.jpeg";

export const Route = createFileRoute("/story")({
  head: () => ({
    meta: [
      { title: "The Story — Vadalur Holy City" },
      { name: "description", content: "Vallalar, the Sathya Gnana Sabha, and the case for declaring Vadalur a Holy City." },
      { property: "og:title", content: "The Story of Vadalur" },
      { property: "og:description", content: "Vallalar, the Sathya Gnana Sabha, and why Vadalur deserves Holy City status." },
      { property: "og:image", content: lampImg },
    ],
  }),
  component: StoryPage,
});

function StoryPage() {
  const t = useT();
  const chapters = [
    { n: 1, title: t.story.ch1Title, body: t.story.ch1Body, img: thanksImg },
    { n: 2, title: t.story.ch2Title, body: t.story.ch2Body, img: sanctuaryImg },
    { n: 3, title: t.story.ch3Title, body: t.story.ch3Body, img: gatheringImg },
  ];
  const sites = [
    { title: t.story.site1Title, body: t.story.site1Body, img: thanksImg },
    { title: t.story.site2Title, body: t.story.site2Body, img: lampImg },
    { title: t.story.site3Title, body: t.story.site3Body, img: gatheringImg },
    { title: t.story.site4Title, body: t.story.site4Body, img: sanctuaryImg },
    { title: t.story.site5Title, body: t.story.site5Body, img: lampImg },
  ];
  const faqs = [
    { q: t.story.faq1Q, a: t.story.faq1A },
    { q: t.story.faq2Q, a: t.story.faq2A },
    { q: t.story.faq3Q, a: t.story.faq3A },
  ];

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      {chapters.map((c, i) => (
        <article
          key={c.n}
          className="mb-16 animate-reveal"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-accent">
            {t.story.ch}&nbsp;{c.n}
          </p>
          <h2 className="mt-2 text-3xl md:text-4xl font-display font-bold">{c.title}</h2>
          <div className="mt-6 grid md:grid-cols-[1fr_1.5fr] gap-6 items-start">
            <div className="relative aspect-square rounded-2xl overflow-hidden ring-1 ring-border">
              <img src={c.img} alt="" className="absolute inset-0 w-full h-full object-cover" />
            </div>
            <p className="text-base md:text-lg leading-relaxed text-muted-foreground">{c.body}</p>
          </div>
        </article>
      ))}

      <section className="mt-12">
        <h2 className="text-2xl md:text-3xl font-display font-bold">{t.story.sitesTitle}</h2>
        <div className="mt-6 grid md:grid-cols-3 gap-5">
          {sites.map((s, i) => (
            <div
              key={i}
              className="rounded-2xl bg-card ring-1 ring-border overflow-hidden animate-reveal"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="aspect-[4/3] relative overflow-hidden">
                <img src={s.img} alt="" className="absolute inset-0 w-full h-full object-cover" />
              </div>
              <div className="p-5">
                <h3 className="font-display font-bold text-lg">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16 rounded-3xl bg-card ring-1 ring-border p-8 md:p-10 text-center">
        <p className="whitespace-pre-line text-base md:text-lg leading-relaxed italic text-foreground">
          {t.story.verse}
        </p>
        <p className="mt-4 text-sm font-mono text-accent">{t.story.verseAttr}</p>
      </section>

      <section className="mt-16">
        <h2 className="text-2xl md:text-3xl font-display font-bold">{t.story.faqsTitle}</h2>
        <div className="mt-6 space-y-4">
          {faqs.map((f, i) => (
            <details
              key={i}
              className="group rounded-2xl bg-card ring-1 ring-border p-5 open:ring-primary/40"
            >
              <summary className="cursor-pointer list-none flex justify-between items-start gap-4 font-display font-semibold text-base md:text-lg">
                <span>{f.q}</span>
                <span className="text-primary transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm md:text-base text-muted-foreground leading-relaxed">
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      <div className="mt-16 text-center">
        <Link
          to="/sign"
          className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
        >
          ✎ {t.story.finalCta}
        </Link>
      </div>
    </div>
  );
}
