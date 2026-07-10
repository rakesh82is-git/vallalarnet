import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Pin,
  Newspaper,
  ExternalLink,
} from "lucide-react";
import { listCampaignUpdates } from "@/lib/petition.functions";
import { useLang } from "@/i18n/context";
import { cn } from "@/lib/utils";

type Props = {
  isOpen: boolean;
  onToggle: () => void;
};

function pickLocalized(ta: string | null, en: string | null, lang: "ta" | "en") {
  if (lang === "ta") return (ta && ta.trim()) || en || "";
  return (en && en.trim()) || ta || "";
}

function formatDate(iso: string, lang: "ta" | "en") {
  try {
    return new Date(iso).toLocaleDateString(lang === "ta" ? "ta-IN" : "en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function CampaignUpdatesDrawer({ isOpen, onToggle }: Props) {
  const { lang } = useLang();
  const fetchUpdates = useServerFn(listCampaignUpdates);
  const { data: updates = [], isLoading } = useQuery({
    queryKey: ["campaign_updates", "published"],
    queryFn: () => fetchUpdates(),
    staleTime: 60_000,
  });

  const heading = lang === "ta" ? "புதிய செய்திகள்" : "Campaign Updates";
  const hideLabel = lang === "ta" ? "மறை" : "Hide";
  const showLabel = lang === "ta" ? "காட்டு" : "Show";
  const emptyLabel = lang === "ta" ? "இன்னும் புதுப்பிப்புகள் இல்லை." : "No updates yet.";
  const loadingLabel = lang === "ta" ? "ஏற்றுகிறது…" : "Loading…";

  const isVideo = (url: string | null) =>
    !!url && /^https?:\/\//i.test(url) && /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(url);
  const isImage = (url: string | null) =>
    !!url && /^https?:\/\//i.test(url) && !isVideo(url);

  function ArticleBody({ u }: { u: (typeof updates)[number] }) {
    const title = pickLocalized(u.title_ta, u.title_en, lang);
    const content = pickLocalized(u.content_ta, u.content_en, lang);
    // Preferred target when the whole article is clicked
    const externalHref =
      u.external_url || (isVideo(u.media_url) ? u.media_url : null);

    const inner = (
      <>
        <header className="flex items-start gap-2">
          {u.is_pinned && (
            <Pin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" aria-hidden />
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold leading-snug text-foreground group-hover:text-primary transition-colors">
              {title}
            </h3>
            <time className="block text-[10px] font-mono uppercase tracking-widest text-muted-foreground mt-1">
              {formatDate(u.created_at, lang)}
            </time>
          </div>
          {externalHref && (
            <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0 mt-1" />
          )}
        </header>
        {u.media_url && (isVideo(u.media_url) || isImage(u.media_url)) && (
          <div className="mt-2">
            {isVideo(u.media_url) ? (
              <video
                src={u.media_url ?? undefined}
                controls
                preload="metadata"
                playsInline
                onClick={(e) => e.stopPropagation()}
                className="w-full rounded-lg border border-border/40 aspect-video object-cover bg-black"
              />
            ) : (
              <img
                src={u.media_url ?? undefined}
                alt=""
                loading="lazy"
                className="w-full rounded-lg border border-border/40 aspect-video object-cover"
              />
            )}
          </div>
        )}
        {content && (
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">
            {content}
          </p>
        )}
      </>
    );

    const cls =
      "group block rounded-xl border border-border/60 bg-background/60 p-3 transition-colors hover:border-primary/50 hover:bg-background text-left w-full";

    if (u.fieldwork_event_id) {
      return (
        <Link
          to="/fieldwork/$id"
          params={{ id: u.fieldwork_event_id }}
          className={cls}
        >
          {inner}
        </Link>
      );
    }
    if (externalHref) {
      return (
        <a
          href={externalHref}
          target="_blank"
          rel="noopener noreferrer"
          className={cls}
        >
          {inner}
        </a>
      );
    }
    return <div className={cls}>{inner}</div>;
  }

  const listBody = (
    <>
      {isLoading && <p className="text-xs text-muted-foreground">{loadingLabel}</p>}
      {!isLoading && updates.length === 0 && (
        <p className="text-xs text-muted-foreground">{emptyLabel}</p>
      )}
      {updates.map((u) => (
        <ArticleBody key={u.id} u={u} />
      ))}
    </>
  );

  return (
    <aside aria-label={heading} className="w-full">
      {/* Desktop: collapsible drawer. Open by default; toggle hides it to a narrow rail. */}
      <div className={cn("hidden lg:sticky lg:top-20", isOpen ? "lg:block" : "lg:hidden")}>
        <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-md shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border/60">
            <Newspaper className="h-4 w-4 text-primary shrink-0" />
            <span className="flex-1 min-w-0 font-display font-semibold tracking-tight text-sm truncate">
              {heading}
            </span>
            <button
              type="button"
              onClick={onToggle}
              aria-label={hideLabel}
              className="p-1 rounded-md hover:bg-secondary/60 transition-colors"
            >
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <div className="max-h-[calc(100vh-8rem)] overflow-y-auto p-4 space-y-3">
            {listBody}
          </div>
        </div>
      </div>

      {/* Desktop collapsed rail */}
      <div
        className={cn(
          "hidden lg:sticky lg:top-20 rounded-2xl border border-border bg-card/60 backdrop-blur-md shadow-sm overflow-hidden",
          isOpen ? "lg:hidden" : "lg:flex lg:flex-col lg:items-center lg:gap-2 lg:p-2",
        )}
      >
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-label={showLabel}
          className="w-full flex flex-col items-center gap-2 py-2 text-left hover:bg-secondary/60 transition-colors"
        >
          <Newspaper className="h-4 w-4 text-primary shrink-0" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground [writing-mode:vertical-rl] whitespace-nowrap">
            {heading}
          </span>
          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Mobile: hidden by default, expands to ~30vh scrollable panel when opened */}
      <div className="lg:hidden">
        <div
          className={cn(
            "rounded-xl border border-border bg-card/95 backdrop-blur-md shadow-lg overflow-hidden",
          )}
        >
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={isOpen}
            aria-controls="campaign-updates-body"
            className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-secondary/60 transition-colors"
          >
            <Newspaper className="h-4 w-4 text-primary shrink-0" />
            <span className="flex-1 min-w-0 font-display font-semibold tracking-tight text-sm truncate">
              {heading}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              {isOpen ? hideLabel : showLabel}
              {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
            </span>
          </button>
          {isOpen && (
            <div
              id="campaign-updates-body"
              className="max-h-[30vh] overflow-y-auto p-3 space-y-2 border-t border-border/60"
            >
              {listBody}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
