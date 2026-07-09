import { useState } from "react";
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
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const heading = lang === "ta" ? "புதிய செய்திகள்" : "Campaign Updates";
  const hideLabel = lang === "ta" ? "மறை" : "Hide";
  const showLabel = lang === "ta" ? "காட்டு" : "Show";
  const emptyLabel = lang === "ta" ? "இன்னும் புதுப்பிப்புகள் இல்லை." : "No updates yet.";
  const loadingLabel = lang === "ta" ? "ஏற்றுகிறது…" : "Loading…";

  const toggleId = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Minimized view: only the top 3 update titles are shown.
  const previewUpdates = updates.slice(0, 3);

  return (
    <aside
      aria-label={heading}
      className={cn(
        "w-full transition-all duration-500 ease-in-out",
        // Desktop width control
        isOpen ? "lg:w-1/5" : "lg:w-10",
      )}
    >
      <div
        className={cn(
          "lg:sticky lg:top-20 rounded-xl border border-border bg-card/95 lg:bg-card/60 backdrop-blur-md shadow-lg lg:shadow-sm",
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
            "w-full flex items-center gap-1.5 px-3 py-2 text-left",
            "hover:bg-secondary/60 transition-colors",
            "border-b border-border/60",
            !isOpen && "lg:border-b-0 lg:h-full lg:flex-col lg:justify-start lg:gap-2 lg:py-3 lg:px-0",
          )}
        >
          <Newspaper
            className={cn(
              "shrink-0 text-primary",
              isOpen ? "h-3.5 w-3.5" : "h-4 w-4 lg:mx-auto",
            )}
          />
          <span
            className={cn(
              "flex-1 min-w-0 font-display text-xs font-semibold tracking-tight truncate",
              !isOpen && "lg:hidden",
            )}
          >
            {heading}
          </span>
          {!isOpen && (
            <span
              className="hidden lg:block text-[9px] font-mono uppercase tracking-widest text-muted-foreground"
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
            >
              {heading}
            </span>
          )}
          {/* Mobile chevron (vertical accordion) */}
          <span className="lg:hidden inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            {isOpen ? hideLabel : showLabel}
            {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </span>
          {/* Desktop chevron (horizontal slide) */}
          <span className="hidden lg:inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            {isOpen ? (
              <>
                {hideLabel}
                <ChevronRight className="h-3 w-3" />
              </>
            ) : (
              <ChevronLeft className="h-3 w-3 mx-auto" />
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
            <div className="max-h-[25vh] overflow-y-auto lg:max-h-[calc(100vh-8rem)] p-3 space-y-2">
              {isLoading && (
                <p className="text-xs text-muted-foreground">{loadingLabel}</p>
              )}
              {!isLoading && updates.length === 0 && (
                <p className="text-xs text-muted-foreground">{emptyLabel}</p>
              )}
              {previewUpdates.map((u) => {
                const title = pickLocalized(u.title_ta, u.title_en, lang);
                const content = pickLocalized(u.content_ta, u.content_en, lang);
                const isExpanded = expandedIds.has(u.id);

                return (
                  <article
                    key={u.id}
                    className="group rounded-lg border border-border/60 bg-background/60 p-2 transition-colors hover:border-primary/50 hover:bg-background"
                  >
                    <header className="flex items-start gap-1.5">
                      {u.is_pinned && (
                        <Pin className="h-3 w-3 text-primary shrink-0 mt-0.5" aria-hidden />
                      )}
                      <button
                        type="button"
                        onClick={() => toggleId(u.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <h3 className="text-xs font-semibold leading-snug text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                          {title}
                        </h3>
                        {isExpanded && (
                          <time className="block text-[9px] font-mono uppercase tracking-widest text-muted-foreground mt-0.5">
                            {formatDate(u.created_at, lang)}
                          </time>
                        )}
                      </button>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {u.external_url && (
                          <a
                            href={u.external_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-0.5 rounded hover:bg-secondary/60"
                            aria-label="Open external link"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-2.5 w-2.5 text-muted-foreground" />
                          </a>
                        )}
                        {u.fieldwork_event_id && (
                          <Link
                            to="/fieldwork/$id"
                            params={{ id: u.fieldwork_event_id }}
                            className="p-0.5 rounded hover:bg-secondary/60"
                            aria-label="View event"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ChevronRight className="h-2.5 w-2.5 text-muted-foreground" />
                          </Link>
                        )}
                        <button
                          type="button"
                          onClick={() => toggleId(u.id)}
                          className="p-0.5 rounded hover:bg-secondary/60"
                          aria-label={isExpanded ? "Collapse" : "Expand"}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-3 w-3 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-3 w-3 text-muted-foreground" />
                          )}
                        </button>
                      </div>
                    </header>
                    {isExpanded && (
                      <div className="mt-1.5">
                        {u.media_url && /^https?:\/\//i.test(u.media_url) && (
                          /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(u.media_url) ? (
                            <video
                              src={u.media_url}
                              controls
                              preload="metadata"
                              playsInline
                              className="w-full rounded border border-border/40 aspect-video object-cover bg-black"
                            />
                          ) : (
                            <img
                              src={u.media_url}
                              alt=""
                              loading="lazy"
                              className="w-full rounded border border-border/40 aspect-video object-cover"
                            />
                          )
                        )}
                        {content && (
                          <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground whitespace-pre-wrap">
                            {content}
                          </p>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
