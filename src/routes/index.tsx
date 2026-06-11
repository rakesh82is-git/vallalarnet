import { createFileRoute } from "@tanstack/react-router";
import sanctuaryImg from "@/assets/sanctuary.jpg";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "வள்ளலார்.net — அருட்பெருஞ்ஜோதி தனிப்பெருங்கருணை" },
      { name: "description", content: "திருவருட்பிரகாச வள்ளலார் இராமலிங்க அடிகளார் — திருவருட்பா, சன்மார்க்க நெறிகள், பூசத் திருநாள் கால அட்டவணை மற்றும் உலக மொழிகளில் வள்ளலார் இலக்கியங்கள்." },
      { property: "og:title", content: "வள்ளலார்.net — அருட்பெருஞ்ஜோதி" },
      { property: "og:description", content: "சுத்த சன்மார்க்க சத்திய சங்கம். திருவருட்பா, ஜீவகாருண்யம் மற்றும் ஒளி வழிபாடு." },
    ],
  }),
  component: Index,
});

const VALLALAR_BIRTH = new Date("1823-10-05T00:00:00Z");

const navItems = [
  { label: "முகப்பு", href: "/" },
  { label: "திருவருட்பா", href: "#nool" },
  { label: "சபைத் தகவல்கள்", href: "#sabai" },
  { label: "நிகழ்வுகள்", href: "#poosam" },
];

const quickAccess = [
  { num: "01", title: "நூல்கள்", desc: "திருவருட்பா ஆறு திருமுறைகள் முழுமையாக" },
  { num: "02", title: "காணொளி", desc: "சத்சங்கம் மற்றும் சொற்பொழிவுகள்" },
  { num: "03", title: "ஒலிவடிவம்", desc: "பஜனைகள் மற்றும் பாராயண ஒலிப்பதிவுகள்" },
  { num: "04", title: "நிகழ்வுகள்", desc: "பூசத் திருவிழா கால அட்டவணை" },
];

const languages = [
  { name: "English", count: "142 நூல்கள்" },
  { name: "हिन्दी", count: "48 நூல்கள்" },
  { name: "മലയാളം", count: "36 நூல்கள்" },
  { name: "ಕನ್ನಡ", count: "28 நூல்கள்" },
  { name: "తెలుగు", count: "24 நூல்கள்" },
  { name: "Français", count: "12 நூல்கள்" },
  { name: "Deutsch", count: "9 நூல்கள்" },
  { name: "Español", count: "8 நூல்கள்" },
  { name: "日本語", count: "6 நூல்கள்" },
  { name: "العربية", count: "5 நூல்கள்" },
] as const;

const poosamDates = [
  { tag: "தைப்பூசம் 2026", date: "ஜனவரி 31", place: "வடலூர் சத்திய ஞான சபை", featured: true },
  { tag: "மாசிப் பூசம்", date: "பிப்ரவரி 28", place: "வடலூர்", featured: false },
  { tag: "பங்குனிப் பூசம்", date: "மார்ச் 27", place: "வடலூர்", featured: false },
];

function useDaysSinceBirth() {
  const [days, setDays] = useState(() =>
    Math.floor((Date.now() - VALLALAR_BIRTH.getTime()) / 86400000),
  );
  useEffect(() => {
    const id = setInterval(() => {
      setDays(Math.floor((Date.now() - VALLALAR_BIRTH.getTime()) / 86400000));
    }, 60_000);
    return () => clearInterval(id);
  }, []);
  return days;
}

function Index() {
  const days = useDaysSinceBirth();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-accent/20">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="text-xl font-display font-bold tracking-tight text-primary">
            வள்ளலார்
          </a>
          <div className="hidden md:flex gap-8 text-sm font-medium">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="hover:text-primary transition-colors"
              >
                {item.label}
              </a>
            ))}
          </div>
          <button className="px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity">
            தேடுக
          </button>
        </div>
      </nav>

      {/* Hero */}
      <header className="relative overflow-hidden pt-24 pb-32 px-6">
        <div className="absolute top-1/2 left-1/2 size-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/25 blur-[120px] animate-glow pointer-events-none" />
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="animate-reveal">
            <p className="text-xs font-mono uppercase tracking-[0.3em] text-accent mb-6">
              Arutperum Jyothi
            </p>
            <h1 className="text-5xl md:text-7xl font-display font-bold text-balance leading-[1.15] mb-10">
              அருட்பெருஞ்ஜோதி
              <br />
              தனிப்பெருங்கருணை
            </h1>
          </div>
          <div className="animate-reveal flex flex-col items-center" style={{ animationDelay: "200ms" }}>
            <div className="text-4xl md:text-6xl font-mono tracking-tighter text-primary mb-2">
              {days.toLocaleString("en-IN")}
            </div>
            <p className="text-sm text-muted-foreground">
              வள்ளலார் அவதரித்து இன்றுடன் நாட்கள்
            </p>
          </div>
        </div>
      </header>

      {/* Quick Access */}
      <section className="max-w-7xl mx-auto px-6 -mt-16 relative z-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {quickAccess.map((item, i) => (
            <a
              key={item.num}
              href="#"
              className="bg-card ring-1 ring-border p-8 rounded-2xl animate-reveal hover:ring-accent/50 hover:-translate-y-1 transition-all"
              style={{ animationDelay: `${300 + i * 100}ms` }}
            >
              <div className="text-accent mb-4 font-mono text-xs">{item.num}</div>
              <h3 className="text-xl font-display font-bold mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </a>
          ))}
        </div>
      </section>

      {/* Languages + Poosam */}
      <section id="poosam" className="max-w-7xl mx-auto px-6 py-24">
        <div className="grid lg:grid-cols-3 gap-16">
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-8 border-b border-border pb-4">
              <h2 className="text-2xl font-display font-bold">மொழிவாரி தொகுப்பு</h2>
              <input
                type="text"
                placeholder="தேடுக..."
                className="bg-transparent border-none outline-none text-sm font-sans placeholder:text-muted-foreground/60 w-32"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-x-12">
              {languages.map((lang) => (
                <a key={lang.name} href="#" className="group cursor-pointer">
                  <div className="flex justify-between items-end border-b border-border/60 py-3 group-hover:border-accent transition-colors">
                    <span className="text-lg">{lang.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">{lang.count}</span>
                  </div>
                </a>
              ))}
            </div>
            <a
              href="#"
              className="inline-block mt-8 text-sm font-mono uppercase tracking-widest text-accent hover:text-primary transition-colors"
            >
              அனைத்து மொழிகளும் →
            </a>
          </div>

          <div>
            <h2 className="text-2xl font-display font-bold mb-8">பூசத் திருநாள்</h2>
            <div className="space-y-4">
              {poosamDates.map((p) => (
                <div
                  key={p.tag}
                  className={
                    p.featured
                      ? "p-6 bg-primary/5 rounded-2xl border border-primary/20"
                      : "p-6 bg-card ring-1 ring-border rounded-2xl"
                  }
                >
                  <div
                    className={
                      p.featured
                        ? "text-xs font-mono text-accent mb-2"
                        : "text-xs font-mono text-muted-foreground mb-2"
                    }
                  >
                    {p.tag}
                  </div>
                  <div className="text-xl font-bold mb-1">{p.date}</div>
                  <div className="text-sm text-muted-foreground">{p.place}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Sanctuary Image */}
      <section id="sabai" className="px-6 pb-24">
        <div className="max-w-7xl mx-auto relative w-full h-[400px] md:h-[520px] rounded-3xl overflow-hidden">
          <img
            src={sanctuaryImg}
            alt="வடலூர் சத்திய ஞான சபை — ஜோதி தரிசனம்"
            width={1600}
            height={800}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/10 to-transparent" />
          <div className="absolute bottom-8 left-8 right-8">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-accent">
              புனித தலம்
            </span>
            <h3 className="mt-2 text-3xl md:text-4xl font-display font-bold text-foreground">
              சத்திய ஞான சபை · வடலூர்
            </h3>
            <p className="mt-2 max-w-xl text-sm text-foreground/80">
              ஏழு திரைகளை நீக்கி ஜோதி தரிசனம் காணும் புனித எண்கோண ஆலயம்.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-primary font-display font-bold">வள்ளலார்.net</div>
          <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
            © {new Date().getFullYear()} Arutperum Jyothi Trust
          </div>
          <div className="flex gap-6 text-xs font-medium">
            <a href="#" className="hover:text-primary transition-colors">தொடர்புக்கு</a>
            <a href="#" className="hover:text-primary transition-colors">நிபந்தனைகள்</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
