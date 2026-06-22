import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getFieldworkEvent } from "@/lib/petition.functions";
import { useLang, useT } from "@/i18n/context";

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

const eventOpts = (id: string) =>
  queryOptions({
    queryKey: ["fieldwork-event", id],
    queryFn: () => getFieldworkEvent({ data: { id } }),
  });

export const Route = createFileRoute("/fieldwork/$id")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(eventOpts(params.id));
    if (!data) throw notFound();
  },
  head: ({ loaderData: _ld, params }) => ({
    meta: [
      { title: "Fieldwork Event — Vadalur Holy City" },
      { name: "description", content: `Fieldwork event ${params.id}` },
    ],
  }),
  notFoundComponent: () => (
    <div className="max-w-3xl mx-auto px-6 py-20 text-center">
      <h1 className="text-2xl font-display font-bold">Fieldwork event not found</h1>
      <p className="mt-2 text-muted-foreground">This fieldwork event no longer exists.</p>
      <Link to="/gallery" className="mt-6 inline-block text-accent underline">Back to gallery</Link>
    </div>
  ),
  errorComponent: ({ error, reset }) => (
    <div className="max-w-3xl mx-auto px-6 py-20 text-center">
      <h1 className="text-2xl font-display font-bold">Something went wrong</h1>
      <p className="mt-2 text-muted-foreground">{error.message}</p>
      <button onClick={reset} className="mt-6 text-accent underline">Try again</button>
    </div>
  ),
  component: FieldworkPage,
});

function FieldworkPage() {
  const t = useT();
  const { lang } = useLang();
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(eventOpts(id));
  if (!data) return null;

  const { event, items } = data;
  const title = lang === "ta" ? event.title_ta : event.title_en;
  const altTitle = lang === "ta" ? event.title_en : event.title_ta;
  const caption = lang === "ta" ? event.caption_ta : event.caption_en;

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <Link to="/gallery" className="text-xs font-mono uppercase tracking-[0.2em] text-accent hover:underline">
        ← {t.gallery.title}
      </Link>
      <h1 className="mt-3 text-3xl md:text-5xl font-display font-bold">{title}</h1>
      {altTitle && altTitle !== title && (
        <p className="mt-2 text-muted-foreground">{altTitle}</p>
      )}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        {event.event_date && <span>{new Date(event.event_date).toLocaleDateString()}</span>}
        {event.location && <span>· {event.location}</span>}
      </div>
      {caption && (
        <p className="mt-6 max-w-3xl text-base leading-relaxed whitespace-pre-line">{caption}</p>
      )}

      {items.length === 0 ? (
        <p className="mt-12 text-center text-muted-foreground">No media yet for this event.</p>
      ) : (
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
          {items.map((item) => {
            const ytId = extractYouTubeId(item.url);
            const isVideoFile = /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(item.url);
            const isVideo = !!ytId || isVideoFile;
            const itemTitle = lang === "ta" ? item.title_ta : item.title_en;
            return (
              <figure
                key={item.id}
                className="overflow-hidden rounded-2xl ring-1 ring-border bg-black"
              >
                {isVideo ? (
                  <div className="aspect-video">
                    {ytId ? (
                      <iframe
                        src={`https://www.youtube.com/embed/${ytId}`}
                        title={itemTitle}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <video
                        src={item.url}
                        controls
                        poster={item.thumb_url ?? undefined}
                        className="w-full h-full"
                      />
                    )}
                  </div>
                ) : (
                  <img
                    src={item.url}
                    alt={itemTitle}
                    className="w-full h-auto object-cover bg-background"
                  />
                )}
              </figure>
            );
          })}
        </div>
      )}
    </div>
  );
}