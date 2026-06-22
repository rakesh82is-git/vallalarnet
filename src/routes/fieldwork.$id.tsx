import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getFieldworkItem } from "@/lib/petition.functions";
import { useLang, useT } from "@/i18n/context";

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

const itemOpts = (id: string) =>
  queryOptions({
    queryKey: ["fieldwork-item", id],
    queryFn: () => getFieldworkItem({ data: { id } }),
  });

export const Route = createFileRoute("/fieldwork/$id")({
  loader: async ({ context, params }) => {
    const item = await context.queryClient.ensureQueryData(itemOpts(params.id));
    if (!item) throw notFound();
  },
  head: ({ loaderData: _ld, params }) => ({
    meta: [
      { title: "Fieldwork — Vadalur Holy City" },
      { name: "description", content: `Fieldwork report ${params.id}` },
    ],
  }),
  notFoundComponent: () => (
    <div className="max-w-3xl mx-auto px-6 py-20 text-center">
      <h1 className="text-2xl font-display font-bold">Fieldwork not found</h1>
      <p className="mt-2 text-muted-foreground">This fieldwork entry no longer exists.</p>
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
  const { data: item } = useSuspenseQuery(itemOpts(id));
  if (!item) return null;

  const title = lang === "ta" ? item.title_ta : item.title_en;
  const ytId = extractYouTubeId(item.url);
  const isVideoFile = /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(item.url);
  const isVideo = ytId || isVideoFile;

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <Link to="/gallery" className="text-xs font-mono uppercase tracking-[0.2em] text-accent hover:underline">
        ← {t.gallery.title}
      </Link>
      <h1 className="mt-3 text-3xl md:text-5xl font-display font-bold">{title}</h1>
      {item.title_en && item.title_ta && item.title_en !== item.title_ta && (
        <p className="mt-2 text-muted-foreground">
          {lang === "ta" ? item.title_en : item.title_ta}
        </p>
      )}

      <div className="mt-8 overflow-hidden rounded-2xl ring-1 ring-border bg-black">
        {isVideo ? (
          <div className="aspect-video">
            {ytId ? (
              <iframe
                src={`https://www.youtube.com/embed/${ytId}`}
                title={title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video src={item.url} controls poster={item.thumb_url ?? undefined} className="w-full h-full" />
            )}
          </div>
        ) : (
          <img src={item.url} alt={title} className="w-full h-auto max-h-[80vh] object-contain bg-background" />
        )}
      </div>
    </div>
  );
}