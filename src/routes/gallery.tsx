import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useT, useLang } from "@/i18n/context";
import { listGallery, listFieldworkEvents } from "@/lib/petition.functions";

import { STATIC } from "@/lib/static-assets";
const gatheringImg = STATIC.gnanaSabaiOver;
function resolve(url: string) {
  return url;
}

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

const opts = queryOptions({ queryKey: ["gallery"], queryFn: () => listGallery() });
const fwOpts = queryOptions({
  queryKey: ["fieldwork-events"],
  queryFn: () => listFieldworkEvents(),
});

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "Gallery — Vadalur Holy City" },
      { name: "description", content: "Photos, videos and field-work from the Vadalur Holy City movement." },
      { property: "og:title", content: "Vadalur Gallery" },
      { property: "og:image", content: gatheringImg },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(opts);
    context.queryClient.ensureQueryData(fwOpts);
  },
  component: GalleryPage,
});

type Item = Awaited<ReturnType<typeof listGallery>>[number];

function GalleryPage() {
  const t = useT();
  const { lang } = useLang();
  const { data } = useSuspenseQuery(opts);
  const { data: fw } = useSuspenseQuery(fwOpts);
  const [lightbox, setLightbox] = useState<Item | null>(null);

  const isVideo = (it: Item) =>
    it.kind === "video" ||
    /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(it.url) ||
    !!extractYouTubeId(it.url);

  const groups = useMemo(() => ({
    photo: data.filter((i) => i.kind === "photo"),
    video: data.filter((i) => i.kind === "video"),
  }), [data]);

  const title = (it: Item) => (lang === "ta" ? it.title_ta : it.title_en);
  const fmtDate = (d: string | null) => {
    if (!d) return null;
    try {
      return new Date(d).toLocaleDateString(lang === "ta" ? "ta-IN" : "en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return d;
    }
  };

  const renderItem = (it: Item, i: number) => (
    <button
      key={it.id}
      onClick={() => setLightbox(it)}
      className="group relative aspect-[4/3] overflow-hidden rounded-2xl ring-1 ring-border bg-secondary text-left animate-reveal"
      style={{ animationDelay: `${i * 40}ms` }}
    >
      <img
        src={resolve(it.thumb_url || it.url)}
        alt={title(it)}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-background/0 to-transparent" />
      {/\.(mp4|webm|mov)(\?|$)/i.test(it.url) || it.kind === "video" ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="size-12 rounded-full bg-primary/90 text-primary-foreground flex items-center justify-center shadow-xl">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          </div>
        </div>
      ) : null}
      <div className="absolute bottom-3 left-3 right-3">
        <p className="text-sm font-medium text-foreground line-clamp-1">{title(it)}</p>
      </div>
    </button>
  );

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

        {(["photo", "video"] as const).map((k) => (
          <TabsContent key={k} value={k}>
            {groups[k].length === 0 ? (
              <p className="text-center text-muted-foreground py-12 italic">{t.gallery.empty}</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {groups[k].map((it, i) => renderItem(it as Item, i))}
              </div>
            )}
          </TabsContent>
        ))}

        <TabsContent value="fieldwork">
          {fw.events.length === 0 && fw.ungrouped.length === 0 ? (
            <p className="text-center text-muted-foreground py-12 italic">{t.gallery.empty}</p>
          ) : (
            <div className="space-y-12">
              {fw.events.map((ev) => (
                <section key={ev.id} className="animate-reveal">
                  <header className="mb-4 border-l-2 border-accent pl-4">
                    <h2 className="text-xl md:text-2xl font-display font-bold">
                      {lang === "ta" ? ev.title_ta : ev.title_en}
                    </h2>
                    {(ev.event_date || ev.location) && (
                      <p className="mt-1 text-xs font-mono uppercase tracking-[0.2em] text-accent">
                        {[fmtDate(ev.event_date), ev.location].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    {(lang === "ta" ? ev.caption_ta : ev.caption_en) && (
                      <p className="mt-2 text-sm text-muted-foreground max-w-3xl">
                        {lang === "ta" ? ev.caption_ta : ev.caption_en}
                      </p>
                    )}
                  </header>
                  {ev.items.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">—</p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {ev.items.map((it, i) => renderItem(it as Item, i))}
                    </div>
                  )}
                </section>
              ))}
              {fw.ungrouped.length > 0 && (
                <section className="animate-reveal">
                  <header className="mb-4 border-l-2 border-border pl-4">
                    <h2 className="text-xl md:text-2xl font-display font-bold text-muted-foreground">
                      {lang === "ta" ? "மற்றவை" : "Other"}
                    </h2>
                  </header>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {fw.ungrouped.map((it, i) => renderItem(it as Item, i))}
                  </div>
                </section>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!lightbox} onOpenChange={(o) => !o && setLightbox(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-background">
          {lightbox && !isVideo(lightbox) && (
            <img src={resolve(lightbox.url)} alt={title(lightbox)} className="w-full h-auto max-h-[80vh] object-contain" />
          )}
          {lightbox && isVideo(lightbox) && (
            <div className="aspect-video bg-black">
              {(() => {
                const ytId = extractYouTubeId(lightbox.url);
                return ytId ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${ytId}`}
                    title={title(lightbox)}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video src={resolve(lightbox.url)} controls className="w-full h-full" />
                );
              })()}
            </div>
          )}
          {lightbox && (
            <div className="px-5 py-3 text-sm text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">{title(lightbox)}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
