import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import sanctuaryImg from "@/assets/sanctuary.jpg";
import lampImg from "@/assets/lamp.jpg";
import gatheringImg from "@/assets/gathering.jpg";
import thanksImg from "@/assets/thanks.jpg";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "படத்தொகுப்பு — வடலூர் நிகழ்வுகள்" },
      {
        name: "description",
        content: "வடலூர் சத்திய ஞான சபை, தைப்பூசம், மாசிப்பூசம், பங்குனிப்பூசம் — நிகழ்வுகளின் படங்களும் காணொளிகளும்.",
      },
      { property: "og:title", content: "வடலூர் படத்தொகுப்பு" },
      { property: "og:image", content: gatheringImg },
    ],
  }),
  component: GalleryPage,
});

type Item =
  | { type: "photo"; src: string; caption: string; span?: string }
  | { type: "video"; src: string; poster: string; caption: string; span?: string };

const items: Item[] = [
  { type: "photo", src: sanctuaryImg, caption: "சத்திய ஞான சபை — விடியல்", span: "md:col-span-2 md:row-span-2" },
  { type: "photo", src: gatheringImg, caption: "தைப்பூசம் ஒன்றுகூடல்" },
  { type: "photo", src: lampImg, caption: "அணையா ஜோதி" },
  { type: "video", src: "", poster: gatheringImg, caption: "தைப்பூசம் காணொளி (placeholder)" },
  { type: "photo", src: thanksImg, caption: "வள்ளலார் கருணை" },
  { type: "photo", src: sanctuaryImg, caption: "எண்கோண ஆலயம்" },
  { type: "video", src: "", poster: lampImg, caption: "ஜோதி தரிசனம் (placeholder)" },
];

function GalleryPage() {
  const [lightbox, setLightbox] = useState<Item | null>(null);

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="text-center mb-10 animate-reveal">
        <p className="text-xs font-mono uppercase tracking-[0.3em] text-accent">Gallery</p>
        <h1 className="mt-3 text-3xl md:text-5xl font-display font-bold">படத்தொகுப்பு</h1>
        <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
          வடலூரின் ஒளி நிறைந்த தருணங்கள் — நிகழ்வுகள், ஜோதி தரிசனம், அடியார் ஒன்றுகூடல்கள்.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 auto-rows-[180px] md:auto-rows-[220px] gap-3">
        {items.map((it, i) => (
          <button
            key={i}
            onClick={() => setLightbox(it)}
            className={`group relative overflow-hidden rounded-2xl ring-1 ring-border bg-secondary text-left animate-reveal ${
              it.span ?? ""
            }`}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <img
              src={it.type === "photo" ? it.src : it.poster}
              alt={it.caption}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-background/0 to-transparent" />
            {it.type === "video" && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="size-14 rounded-full bg-primary/90 text-primary-foreground flex items-center justify-center shadow-xl">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            )}
            <div className="absolute bottom-3 left-3 right-3">
              <span className="text-[10px] font-mono uppercase tracking-widest text-accent">
                {it.type === "video" ? "காணொளி" : "படம்"}
              </span>
              <p className="text-sm font-medium text-foreground line-clamp-1">{it.caption}</p>
            </div>
          </button>
        ))}
      </div>

      <p className="mt-10 text-xs text-center text-muted-foreground">
        காணொளிகள் தற்போது இடம்-பிடித்த படங்கள் — உண்மையான காணொளிகளை பின்னர் பதிவேற்றலாம்.
      </p>

      <Dialog open={!!lightbox} onOpenChange={(o) => !o && setLightbox(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-background">
          {lightbox?.type === "photo" && (
            <img
              src={lightbox.src}
              alt={lightbox.caption}
              className="w-full h-auto max-h-[80vh] object-contain"
            />
          )}
          {lightbox?.type === "video" && (
            <div className="aspect-video bg-black flex items-center justify-center text-muted-foreground">
              <p>காணொளி இடம்-பிடிப்பு · {lightbox.caption}</p>
            </div>
          )}
          {lightbox && (
            <div className="px-5 py-3 text-sm text-muted-foreground">{lightbox.caption}</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}