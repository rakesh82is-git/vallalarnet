import { Link, useRouterState } from "@tanstack/react-router";
import { Flame } from "lucide-react";
import { useLang } from "@/i18n/context";

/**
 * Persistent "Sign here" call-to-action that floats in the blank space at the
 * right edge of every public page (hidden on /sign and /admin). On wide
 * screens it renders as a vertical ribbon centred on the right edge; on
 * smaller screens it becomes a compact pill above the Campaign Updates sheet.
 */
export function SignCtaFloater() {
  const { t } = useLang();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname === "/sign" || pathname.startsWith("/admin")) return null;

  return (
    <Link
      to="/sign"
      aria-label={t.nav.signHere}
      className="fixed z-30 right-3 bottom-24 md:right-0 md:bottom-auto md:top-1/2 md:-translate-y-1/2 group"
    >
      <span
        className="flame-chip inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold tracking-wide transition-transform group-hover:scale-105 md:[writing-mode:vertical-rl] md:rounded-l-full md:rounded-r-none md:px-2.5 md:py-4 md:text-sm"
      >
        <Flame className="h-3.5 w-3.5 md:h-4 md:w-4 md:rotate-90" aria-hidden />
        {t.nav.signHere}
      </span>
    </Link>
  );
}
