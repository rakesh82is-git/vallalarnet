import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useT, useLang } from "@/i18n/context";
import { listGallery } from "@/lib/petition.functions";

// Map seeded `/seed/<name>.jpg` paths to bundled assets (URL strings)
import sanctuaryImg from "@/assets/sanctuary.jpg";
import lampImg from "@/assets/lamp.jpg";
import gatheringImg from "@/assets/gathering.jpg";
import thanksImg from "@/assets/thanks.jpg";
import vallalPeruman from "@/assets/vallal-peruman.jpg.asset.json";

const SEED: Record<string, string> = {
  "/seed/sanctuary.jpg": sanctuaryImg,
  "/seed/lamp.jpg": lampImg,
  "/seed/gathering.jpg": gatheringImg,
  "/seed/thanks.jpg": thanksImg,
  "/seed/vallal-peruman.jpg": vallalPeruman.url,
};
function resolve(url: string) {
  return SEED[url] ?? url;
}

const opts = queryOptions({ queryKey: ["gallery"], queryFn: () => listGallery() });

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "Gallery — Vadalur Holy City" },
      { name: "description", content: "Photos, videos and field-work from the Vadalur Holy City movement." },
      { property: "og:title", content: "Vadalur Gallery" },
      { property: "og:image", content: gatheringImg },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  component: GalleryPage,
});

type Item = Awaited<ReturnType<typeof listGallery>>[number];

function GalleryPage() {
  const t = useT();
  const { lang } = useLang();
  const { data } = useSuspenseQuery(opts);
  const [lightbox, setLightbox] = useState<Item | null>(null);

  const groups = useMemo(() => ({
    photo: [
      {
        id: "featured-vallal-peruman",
        kind: "photo" as const,
        url: vallalPeruman.url,
        thumb_url: vallalPeruman.url,
        title_ta: "வள்ளல் பெருமான்",
        title_en: "Vallal Peruman",
        sort_order: 0,
      } as Item,
      ...data.filter((i) => i.kind === "photo"),
    ],
    video: data.filter((i) => i.kind === "video"),
    fieldwork: data.filter((i) => i.kind === "fieldwork"),
  }), [data]);

  const title = (it: Item) => (lang === "ta" ? it.title_ta : it.title_en);

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="text-center mb-10 animate-reveal">
        <p className="text-xs font-mono uppercase tracking-[0.3em] text-accent">── {t.gallery.title} ──</p>
        <h1 className="mt-3 text-3xl md:text-5xl font-display font-bold">{t.gallery.title}</h1>
        <p className="mt-3 text-muted-foreground max-w-xl mx-auto">{t.gallery.lede}</p>
      </div>

      <Tabs defaultValue="photo" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="photo">{t.gallery.tabPhotos}</TabsTrigger>
          <TabsTrigger value="video">{t.gallery.tabVideos}</TabsTrigger>
          <TabsTrigger value="fieldwork">{t.gallery.tabFieldwork}</TabsTrigger>
        </TabsList>

        {(["photo", "video", "fieldwork"] as const).map((k) => (
          <TabsContent key={k} value={k}>
            {groups[k].length === 0 ? (
              <p className="text-center text-muted-foreground py-12 italic">{t.gallery.empty}</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {groups[k].map((it, i) => (
                  <button
                    key={it.id}
                    onClick={() => setLightbox(it)}
                    className="group relative aspect-[4/3] overflow-hidden rounded-2xl ring-1 ring-border bg-secondary text-left animate-reveal"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <img
                      src={resolve(it.url)}
                      alt={title(it)}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-background/0 to-transparent" />
                    {it.kind === "video" && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="size-12 rounded-full bg-primary/90 text-primary-foreground flex items-center justify-center shadow-xl">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                        </div>
                      </div>
                    )}
                    <div className="absolute bottom-3 left-3 right-3">
                      <p className="text-sm font-medium text-foreground line-clamp-1">{title(it)}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={!!lightbox} onOpenChange={(o) => !o && setLightbox(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-background">
          {lightbox && lightbox.kind !== "video" && (
            <img src={resolve(lightbox.url)} alt={title(lightbox)} className="w-full h-auto max-h-[80vh] object-contain" />
          )}
          {lightbox?.kind === "video" && (
            <div className="aspect-video bg-black flex items-center justify-center text-muted-foreground">
              <p>{title(lightbox)}</p>
            </div>
          )}
          {lightbox && <div className="px-5 py-3 text-sm text-muted-foreground">{title(lightbox)}</div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}