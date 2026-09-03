import { Link, useRouterState } from "@tanstack/react-router";
import { useLang } from "@/i18n/context";

/**
 * Persistent "Sign here" call-to-action that floats in the blank space at the
 * right edge of every public page (hidden on /sign and /admin). The chip is
 * shaped like the flame of an oil lamp — a pointed-top teardrop outline —
 * breathing through the saffron/amber palette. On wide screens it renders as
 * a vertical ribbon centred on the right edge; on smaller screens it becomes
 * a compact flame above the Campaign Updates sheet.
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
        className="flame-chip inline-flex items-center justify-center px-5 py-3 text-xs font-semibold tracking-wide transition-transform group-hover:scale-105 md:[writing-mode:vertical-rl] md:px-3 md:py-6 md:text-sm"
      >
        {t.nav.signHere}
      </span>
    </Link>
  );
}
