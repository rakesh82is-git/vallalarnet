import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import sanctuaryImg from "@/assets/sanctuary.jpg";
import lampImg from "@/assets/lamp.jpg";
import { getSignatureCount, useStoreVersion } from "@/lib/petition-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "வள்ளலார்.net — வடலூர் புனித நகரம்" },
      { name: "description", content: "திருவருட்பிரகாச வள்ளலார் இராமலிங்க அடிகளாரின் தனிப்பெருங்கருணை கொள்கையில் இணைந்து, வடலூர் புனித நகரமாக அறிவிக்கப்பட வேண்டும் என்ற வேண்டுகோளுக்கு உங்கள் கையொப்பத்தை இடுங்கள்." },
      { property: "og:title", content: "வடலூர் புனித நகரம் — உங்கள் கையொப்பம்" },
      { property: "og:description", content: "அருட்பெருஞ்ஜோதி அடியார் ஒவ்வொருவரின் கையொப்பமும் ஒரு ஒளிக்கீற்று." },
      { property: "og:image", content: sanctuaryImg },
    ],
  }),
  component: Index,
});

const INTRO_LINES = [
  "ஒரே இனம், ஒரே சமயம், ஒரே கடவுள் என்று அருட்பெருஞ்ஜோதி வள்ளலார் காட்டிய ஒளி நெறி இன்றும் வடலூரில் சுடர்விட்டு எரிகிறது.",
  "சாதி, மத, மொழி வேறுபாடின்றி அனைவரும் ஒன்றுகூடும் சத்திய ஞான சபை — உலகின் தனிச்சிறப்பு வாய்ந்த ஆன்மிக மையம்.",
  "ஜீவகாருண்யம், சுத்த சன்மார்க்கம், தனிப்பெருங்கருணை எனும் மூன்று கொள்கைகளால் இவ்வுலகிற்கு ஒளியூட்டிய மாமுனிவரின் பிறப்பிடம்.",
  "ஏழைகளுக்கு உணவளிக்கும் சத்திய தர்மச் சாலை இன்றும் தினமும் இடைவிடாது இயங்கி வருகிறது — பசித்த ஒருவரும் திரும்ப அனுப்பப்படுவதில்லை.",
  "ஏழு திரைகளை நீக்கி காட்சி தரும் ஜோதி தரிசனம் — ஒளியே கடவுள் என்ற உண்மையை கண்கூடாகக் காட்டும் அதிசயம்.",
  "தைப்பூசம், மாசிப்பூசம், பங்குனிப்பூசம் — மூன்று பெருந்திருவிழாக்களில் உலகின் பல்வேறு நாடுகளிலிருந்து லட்சக்கணக்கான அடியார்கள் வருகின்றனர்.",
  "திருவருட்பா ஆறு திருமுறைகள் — தமிழின் தலையாய ஆன்மிக இலக்கியக் கருவூலம், 5818 பாடல்களின் தெய்வீகத் தொகுப்பு.",
  "வள்ளலார் தம் கையால் ஏற்றிய ஜோதி, இன்றும் சத்திய ஞான சபையில் அணையாமல் சுடர்விட்டு எரிகிறது.",
  "சித்தி வளாகம், அருட்பெருஞ்ஜோதி ஆலயம், தர்மச்சாலை, கல்விக்கூடம் — ஒவ்வொரு கட்டிடமும் வரலாற்றுச் சின்னம்.",
  "உலக சமாதானத்திற்கு ஒரு கலங்கரை விளக்கம் ஆகும் தகுதி வடலூருக்கு உள்ளது.",
  "இந்த தலம் சாதாரண நகரம் அல்ல — இது வழிபடும் தலம், புனிதம் காக்கப்பட வேண்டிய தலம்.",
  "ஆனால் இன்று சுற்றுச்சூழல் மாசு, ஆட்சி இணைப்புகள், வணிக மய நெருக்கடி என பல சவால்கள் வடலூரின் தூய்மையை அச்சுறுத்துகின்றன.",
  "வடலூரை அரசு அதிகாரப்பூர்வமாக “புனித நகரம்” (Holy City) என்று அறிவிக்கும்போது மட்டுமே இதன் ஆன்மிகச் சூழல் முழுமையாகப் பாதுகாக்கப்படும்.",
  "புதிய சட்ட பாதுகாப்பு, தடை செய்யப்பட்ட பகுதிகள், சுற்றுச்சூழல் கட்டுப்பாடுகள், போக்குவரத்து திட்டமிடல் — அனைத்தும் இதனால் சாத்தியமாகும்.",
  "இது ஒரு சமயத்தின் கோரிக்கை அல்ல — இது மானுட ஒற்றுமையின் கோரிக்கை, அருளின் கோரிக்கை.",
  "திருப்பதி, பழனி, காசி, மதுரை போல வடலூரும் பாதுகாக்கப்பட்ட புனித நகரமாக அறிவிக்கப்பட வேண்டும்.",
  "உங்கள் ஒவ்வொருவரின் கையொப்பமும் ஒரு ஒளிக்கீற்று — பல லட்சம் ஒளிக்கீற்றுகள் சேர்ந்தால் ஒரு பெரிய ஜோதி.",
  "டிஜிட்டல் கையொப்பம் அல்லது கையெழுத்திட்ட ஆவணம் — இரண்டில் எது வசதியோ அதன் மூலம் இந்த இயக்கத்தில் இணைய முடியும்.",
  "ஒரு கைபேசி எண்ணுக்கு ஒரு கையொப்பம் மட்டுமே — ஒவ்வொரு குரலும் தனித்துவமானது, மதிப்புமிக்கது.",
  "வாருங்கள், அருட்பெருஞ்ஜோதியின் ஒளியில் இணைந்து வடலூரைப் புனித நகரமாக்குவோம் — தனிப்பெருங்கருணை வாழ்க!",
];

function Index() {
  useStoreVersion();
  const count = getSignatureCount();
  return (
    <>
      <header className="relative overflow-hidden pt-12 md:pt-20 pb-16 px-6">
        <div className="absolute top-32 left-1/2 size-[680px] -translate-x-1/2 rounded-full bg-accent/25 blur-[140px] animate-glow pointer-events-none" />
        <div className="relative max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div className="animate-reveal">
            <p className="text-xs font-mono uppercase tracking-[0.3em] text-accent mb-5">
              Arutperum Jyothi · Vadalur
            </p>
            <h1 className="text-4xl md:text-6xl font-display font-bold text-balance leading-[1.1]">
              வடலூர்
              <br />
              <span className="text-primary">புனித நகரம்</span> ஆக
              <br />
              அறிவிக்கப்பட வேண்டும்.
            </h1>
            <p className="mt-6 text-base md:text-lg text-muted-foreground max-w-xl">
              வள்ளலார் இராமலிங்க அடிகளார் ஏற்றிய அழியா ஜோதியின் தலம், ஒளி நெறியின் கலங்கரை விளக்கம்.
              உங்கள் கையொப்பம் இந்த இயக்கத்திற்கு ஒரு புதிய ஒளிக்கீற்று.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 items-center">
              <Link
                to="/signature"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
              >
                உங்கள் கையொப்பம் இடுங்கள் →
              </Link>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card ring-1 ring-border">
                <span className="size-2 rounded-full bg-accent animate-pulse" />
                <span className="font-mono text-sm">
                  {count.toLocaleString("en-IN")} கையொப்பங்கள்
                </span>
              </div>
            </div>
          </div>
          <div className="relative animate-reveal" style={{ animationDelay: "200ms" }}>
            <div className="relative aspect-[4/5] rounded-3xl overflow-hidden ring-1 ring-border shadow-2xl shadow-primary/10">
              <img
                src={sanctuaryImg}
                alt="வடலூர் சத்திய ஞான சபை"
                width={1280}
                height={1600}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-accent">
                  புனித தலம்
                </span>
                <p className="mt-1 text-xl font-display font-bold text-foreground">
                  சத்திய ஞான சபை · வடலூர்
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-10 text-center animate-reveal">
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-accent">
            ஏன் இந்த இயக்கம்?
          </p>
          <h2 className="mt-3 text-3xl md:text-4xl font-display font-bold">
            இருபது வரிகளில் ஒரு வேண்டுகோள்
          </h2>
        </div>
        <ol className="space-y-5 list-none">
          {INTRO_LINES.map((line, i) => (
            <li
              key={i}
              className="flex gap-4 animate-reveal"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <span className="shrink-0 font-mono text-xs text-accent pt-1.5 w-8">
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="text-base md:text-lg leading-relaxed">{line}</p>
            </li>
          ))}
        </ol>
        <div className="mt-12 text-center">
          <Link
            to="/signature"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
          >
            இணைய நான் தயார் — கையொப்பம் இடுங்கள்
          </Link>
        </div>
      </section>

      <section className="px-6 pb-8">
        <div className="max-w-6xl mx-auto relative w-full h-[300px] md:h-[420px] rounded-3xl overflow-hidden">
          <img
            src={lampImg}
            alt="அணையா ஜோதி"
            width={1280}
            height={896}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/10 to-transparent" />
          <div className="absolute bottom-8 left-8 right-8">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-accent">
              அணையா ஜோதி
            </span>
            <h3 className="mt-2 text-2xl md:text-3xl font-display font-bold">
              ஒளியே கடவுள் · கடவுளே ஒளி
            </h3>
          </div>
    </div>
      </section>
    </>
  );
}
