import { Link, useRouterState } from "@tanstack/react-router";
import { useLang } from "@/i18n/context";

/**
 * Persistent "Sign here" call-to-action: a Sacred Diya (Agal Vilakku)
 * medallion anchored to the right edge, vertically centred on every viewport.
 * The opaque silhouette follows the lamp and label; its aura breathes gently.
 * Hidden on /sign and /admin.
 */
export function SignCtaFloater() {
  const { t } = useLang();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname === "/sign" || pathname.startsWith("/admin")) return null;

  return (
    <Link
      to="/sign"
      aria-label={t.nav.signHere}
      className="fixed z-30 right-2 top-1/2 -translate-y-1/2 group"
    >
      <span className="relative isolate flex w-[6.75rem] flex-col items-center gap-1 px-1.5 pb-2.5 pt-2 transition-transform duration-300 group-hover:scale-105 md:w-[8.5rem]">
        <svg viewBox="0 0 136 120" preserveAspectRatio="none" className="diya-medallion pointer-events-none absolute inset-0 -z-10 h-full w-full" aria-hidden="true">
          <path d="M68 2 C48 2 38 17 38 34 C38 45 42 53 38 60 C34 66 22 66 12 72 C5 76 2 83 2 94 C2 110 11 118 27 118 H109 C125 118 134 110 134 94 C134 83 131 76 124 72 C114 66 102 66 98 60 C94 53 98 45 98 34 C98 17 88 2 68 2 Z" fill="var(--card)" stroke="var(--primary)" strokeOpacity="0.45" strokeWidth="1" />
        </svg>
        <svg viewBox="0 0 64 64" className="h-11 w-11 md:h-12 md:w-12" aria-hidden="true">
          <defs>
            <radialGradient id="diya-glow" cx="50%" cy="45%" r="50%">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.55" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="diya-flame-g" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="var(--primary)" />
              <stop offset="60%" stopColor="var(--accent)" />
              <stop offset="100%" stopColor="var(--manual)" />
            </linearGradient>
            <linearGradient id="diya-bowl-g" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--manual)" />
              <stop offset="100%" stopColor="var(--primary)" />
            </linearGradient>
          </defs>
          <circle cx="32" cy="24" r="20" fill="url(#diya-glow)" />
          <path
            className="diya-flame"
            d="M32 6 C36 14 40 19 40 26 C40 31 36.5 34 32 34 C27.5 34 24 31 24 26 C24 19 28 14 32 6 Z"
            fill="url(#diya-flame-g)"
          />
          <path d="M32 18 C34 22 35.5 24 35.5 27 C35.5 29.5 34 31 32 31 C30 31 28.5 29.5 28.5 27 C28.5 24 30 22 32 18 Z" fill="var(--card)" opacity="0.75" />
          <path d="M8 38 C14 36 50 36 56 38 C54 48 44 54 32 54 C20 54 10 48 8 38 Z" fill="url(#diya-bowl-g)" />
          <path d="M8 38 C14 41 50 41 56 38" fill="none" stroke="var(--card)" strokeOpacity="0.5" strokeWidth="1.2" />
          <rect x="24" y="54" width="16" height="3" rx="1.5" fill="var(--primary)" />
        </svg>
        <span className="w-full min-w-0 break-words text-center text-[8px] font-semibold leading-snug text-primary md:text-[10.5px]">
          {t.nav.signHere}
        </span>
      </span>
    </Link>
  );
}
