import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Pin, Newspaper, ExternalLink } from "lucide-react";
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

  return (
    <aside
      aria-label={heading}
      className={cn(
        "w-full transition-all duration-500 ease-in-out",
        // Desktop width control
        isOpen ? "lg:w-1/3" : "lg:w-12",
      )}
    >
      <div
        className={cn(
          "lg:sticky lg:top-20 rounded-2xl border border-border bg-card/95 lg:bg-card/60 backdrop-blur-md shadow-lg lg:shadow-sm",
          "transition-all duration-500 ease-in-out overflow-hidden",
          // On desktop when closed, hide content and become a thin rail
          !isOpen && "lg:h-[calc(100vh-6rem)]",
        )}
      >
        {/* Header / toggle */}
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls="campaign-updates-body"
          className={cn(
            "w-full flex items-center gap-2 px-4 py-3 text-left",
            "hover:bg-secondary/60 transition-colors",
            "border-b border-border/60",
            !isOpen && "lg:border-b-0 lg:h-full lg:flex-col lg:justify-start lg:gap-3 lg:py-4 lg:px-0",
          )}
        >
          <Newspaper
            className={cn(
              "shrink-0 text-primary",
              isOpen ? "h-4 w-4" : "h-5 w-5 lg:mx-auto",
            )}
          />
          <span
            className={cn(
              "flex-1 min-w-0 font-display text-sm font-semibold tracking-tight truncate",
              !isOpen && "lg:hidden",
            )}
          >
            {heading}
          </span>
          {!isOpen && (
            <span
              className="hidden lg:block text-[10px] font-mono uppercase tracking-widest text-muted-foreground"
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
            >
              {heading}
            </span>
          )}
          {/* Mobile chevron (vertical accordion) */}
          <span className="lg:hidden inline-flex items-center gap-1 text-xs font-mono uppercase tracking-widest text-muted-foreground">
            {isOpen ? hideLabel : showLabel}
            {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </span>
          {/* Desktop chevron (horizontal slide) */}
          <span className="hidden lg:inline-flex items-center gap-1 text-xs font-mono uppercase tracking-widest text-muted-foreground">
            {isOpen ? (
              <>
                {hideLabel}
                <ChevronRight className="h-3.5 w-3.5" />
              </>
            ) : (
              <ChevronLeft className="h-3.5 w-3.5 mx-auto" />
            )}
          </span>
        </button>

        {/* Body — collapsible on mobile via grid-rows trick, visible (and scrollable) on desktop when open */}
        <div
          id="campaign-updates-body"
          className={cn(
            "grid transition-[grid-template-rows] duration-500 ease-in-out",
            isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
            // On desktop, when closed we already shrink the whole aside; hide body
            !isOpen && "lg:hidden",
          )}
        >
          <div className="overflow-hidden">
            <div className="max-h-[30vh] overflow-y-auto lg:max-h-[calc(100vh-9rem)] p-4 space-y-4">
              {isLoading && (
                <p className="text-xs text-muted-foreground">{loadingLabel}</p>
              )}
              {!isLoading && updates.length === 0 && (
                <p className="text-xs text-muted-foreground">{emptyLabel}</p>
              )}
              {updates.map((u) => {
                const title = pickLocalized(u.title_ta, u.title_en, lang);
                const content = pickLocalized(u.content_ta, u.content_en, lang);
                const inner = (
                  <article className="group rounded-xl border border-border/60 bg-background/60 p-3 transition-colors hover:border-primary/50 hover:bg-background">
                    <header className="flex items-start gap-2">
                      {u.is_pinned && (
                        <Pin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" aria-hidden />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {title ? (
                            <h3 className="text-sm font-semibold leading-snug text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                              {title}
                            </h3>
                          ) : null}
                          {u.external_url && (
                            <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" aria-hidden />
                          )}
                        </div>
                        <time className="block text-[10px] font-mono uppercase tracking-widest text-muted-foreground mt-1">
                          {formatDate(u.created_at, lang)}
                        </time>
                      </div>
                    </header>
                    {u.media_url && /^https?:\/\//i.test(u.media_url) && (
                      /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(u.media_url) ? (
                        <video
                          src={u.media_url}
                          controls
                          preload="metadata"
                          playsInline
                          className="mt-2 w-full rounded-lg border border-border/40 aspect-video object-cover bg-black"
                        />
                      ) : (
                        <img
                          src={u.media_url}
                          alt=""
                          loading="lazy"
                          className="mt-2 w-full rounded-lg border border-border/40 aspect-video object-cover"
                        />
                      )
                    )}
                    {content && (
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground line-clamp-4 whitespace-pre-wrap">
                        {content}
                      </p>
                    )}
                  </article>
                );

                if (u.fieldwork_event_id) {
                  return (
                    <Link
                      key={u.id}
                      to="/fieldwork/$id"
                      params={{ id: u.fieldwork_event_id }}
                      className="block"
                    >
                      {inner}
                    </Link>
                  );
                }
                if (u.external_url) {
                  return (
                    <a
                      key={u.id}
                      href={u.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      {inner}
                    </a>
                  );
                }
                return <div key={u.id}>{inner}</div>;
              })}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}