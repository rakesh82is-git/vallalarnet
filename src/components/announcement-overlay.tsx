import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useRouterState } from "@tanstack/react-router";
import { X, Megaphone } from "lucide-react";
import {
  getActiveAnnouncement,
  type SiteAnnouncement,
} from "@/lib/announcement.functions";
import { useLang } from "@/i18n/context";

const LS_KEY = (id: string) => `vd_ann_dismissed:${id}`;
const SS_KEY = (id: string) => `vd_ann_session:${id}`;

function isDismissed(a: SiteAnnouncement): boolean {
  if (a.dismissal_rule === "every_page_load") return false;
  try {
    if (a.dismissal_rule === "once_per_session") {
      return !!sessionStorage.getItem(SS_KEY(a.id));
    }
    return !!localStorage.getItem(LS_KEY(a.id));
  } catch {
    return false;
  }
}

function markDismissed(a: SiteAnnouncement) {
  try {
    if (a.dismissal_rule === "once_per_session") {
      sessionStorage.setItem(SS_KEY(a.id), "1");
    } else if (a.dismissal_rule === "once_per_announcement") {
      localStorage.setItem(LS_KEY(a.id), "1");
    }
  } catch {
    /* storage unavailable */
  }
}

function pickLocalized(ta: string | null, en: string | null, lang: "ta" | "en") {
  if (lang === "ta") return (ta && ta.trim()) || en || "";
  return (en && en.trim()) || ta || "";
}

function isVideoUrl(url: string | null) {
  return !!url && /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(url);
}

export function AnnouncementOverlay() {
  const { lang } = useLang();
  const fetchAnnouncement = useServerFn(getActiveAnnouncement);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [announcement, setAnnouncement] = useState<SiteAnnouncement | null>(null);
  const [visible, setVisible] = useState(false);

  const isAdminPage = pathname.startsWith("/admin");

  useEffect(() => {
    if (isAdminPage) {
      setVisible(false);
      setAnnouncement(null);
      return;
    }
    let alive = true;
    fetchAnnouncement({ data: { path: pathname } })
      .then((r) => {
        if (!alive) return;
        const a = r.announcement;
        if (a && !isDismissed(a)) {
          setAnnouncement(a);
          setVisible(true);
        } else {
          setAnnouncement(null);
          setVisible(false);
        }
      })
      .catch(() => {
        if (alive) {
          setAnnouncement(null);
          setVisible(false);
        }
      });
    return () => {
      alive = false;
    };
  }, [pathname, isAdminPage, fetchAnnouncement]);

  // Lock page scroll while the overlay is up — visitors must close it first.
  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [visible]);

  if (!visible || !announcement) return null;

  const title = pickLocalized(announcement.title_ta, announcement.title_en, lang);
  const body = pickLocalized(announcement.body_ta, announcement.body_en, lang);
  const closeLabel = lang === "ta" ? "மூடு" : "Close";

  const mediaUrl = announcement.media_url;
  const mediaKind =
    announcement.media_type === "video" ||
    (!announcement.media_type && isVideoUrl(mediaUrl))
      ? "video"
      : announcement.media_type === "image" || mediaUrl
        ? "image"
        : null;

  function handleClose() {
    if (announcement) markDismissed(announcement);
    setVisible(false);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title || "Announcement"}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-background/85 backdrop-blur-md p-4"
    >
      <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-3xl bg-card ring-1 ring-border shadow-2xl">
        <button
          type="button"
          onClick={handleClose}
          aria-label={closeLabel}
          className="absolute top-3 right-3 z-10 rounded-full bg-background/80 ring-1 ring-border p-2 text-muted-foreground hover:text-foreground hover:ring-primary/60 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6 md:p-8">
          <div className="flex items-center gap-2 text-primary mb-3">
            <Megaphone className="h-4 w-4 shrink-0" />
            <span className="text-[10px] font-mono uppercase tracking-widest">
              {lang === "ta" ? "அறிவிப்பு" : "Announcement"}
            </span>
          </div>

          {title && (
            <h2 className="text-xl md:text-2xl font-display font-bold leading-snug pr-8">
              {title}
            </h2>
          )}

          {mediaUrl && mediaKind === "video" && (
            <video
              src={mediaUrl}
              controls
              playsInline
              preload="metadata"
              className="mt-4 w-full rounded-xl ring-1 ring-border aspect-video object-cover bg-black"
            />
          )}
          {mediaUrl && mediaKind === "image" && (
            <img
              src={mediaUrl}
              alt=""
              className="mt-4 w-full rounded-xl ring-1 ring-border object-cover"
            />
          )}

          {body && (
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
              {body}
            </p>
          )}

          <button
            type="button"
            onClick={handleClose}
            className="mt-6 w-full rounded-full bg-primary text-primary-foreground py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            {closeLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
