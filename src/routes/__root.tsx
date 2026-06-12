import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { LanguageProvider, useLang } from "@/i18n/context";

const NAV = [
  { to: "/", key: "home" },
  { to: "/story", key: "story" },
  { to: "/sign", key: "sign" },
  { to: "/wall", key: "wall" },
  { to: "/analytics", key: "analytics" },
  { to: "/gallery", key: "gallery" },
] as const;

function LangSwitcher() {
  const { lang, setLang } = useLang();
  return (
    <div className="inline-flex rounded-full ring-1 ring-border bg-card overflow-hidden text-xs font-mono">
      <button
        onClick={() => setLang("ta")}
        className={`px-3 py-1.5 transition-colors ${lang === "ta" ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
        aria-pressed={lang === "ta"}
      >
        த
      </button>
      <button
        onClick={() => setLang("en")}
        className={`px-3 py-1.5 transition-colors ${lang === "en" ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
        aria-pressed={lang === "en"}
      >
        EN
      </button>
    </div>
  );
}

function SiteShell({ children }: { children: ReactNode }) {
  const { t } = useLang();
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans selection:bg-accent/20">
      <nav className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 text-base md:text-xl font-display font-bold tracking-tight text-primary shrink-0">
            <span className="text-lg">✦</span>
            <span>{t.nav.brand}</span>
          </Link>
          <div className="hidden md:flex gap-5 text-sm font-medium overflow-x-auto">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="hover:text-primary transition-colors whitespace-nowrap"
                activeProps={{ className: "text-primary" }}
                activeOptions={{ exact: n.to === "/" }}
              >
                {t.nav[n.key as keyof typeof t.nav]}
              </Link>
            ))}
          </div>
          <LangSwitcher />
        </div>
        <div className="md:hidden border-t border-border bg-background/80">
          <div className="max-w-6xl mx-auto px-4 py-2 flex gap-4 text-xs font-medium overflow-x-auto">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="hover:text-primary transition-colors whitespace-nowrap"
                activeProps={{ className: "text-primary" }}
                activeOptions={{ exact: n.to === "/" }}
              >
                {t.nav[n.key as keyof typeof t.nav]}
              </Link>
            ))}
          </div>
        </div>
      </nav>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border py-8 px-6 mt-16">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-muted-foreground">
          <div className="font-display font-bold text-primary text-sm">அருட்பெருஞ்ஜோதி</div>
          <div className="font-mono uppercase tracking-widest text-center">
            {t.footer.line}
          </div>
          <div className="font-mono uppercase tracking-widest">தனிப்பெருங்கருணை</div>
        </div>
      </footer>
    </div>
  );
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "VallalarNet Lovable Rendition" },
      { name: "description", content: "Arutperum Jyothi Web offers a modern, Tamil-language web interface for spiritual content." },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "VallalarNet Lovable Rendition" },
      { property: "og:description", content: "Arutperum Jyothi Web offers a modern, Tamil-language web interface for spiritual content." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "VallalarNet Lovable Rendition" },
      { name: "twitter:description", content: "Arutperum Jyothi Web offers a modern, Tamil-language web interface for spiritual content." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f2afbcff-3b3d-4ca5-becc-758aa42af641/id-preview-201b1d66--32747843-b731-414e-ab08-3fa8c1c32466.lovable.app-1781169193046.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f2afbcff-3b3d-4ca5-becc-758aa42af641/id-preview-201b1d66--32747843-b731-414e-ab08-3fa8c1c32466.lovable.app-1781169193046.png" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Hind+Madurai:wght@400;500;600;700&family=Noto+Sans+Tamil:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (() => {
                const reloadKey = "vallalarnet:stale-vite-reload";
                const shouldReload = (value) => {
                  const text = String(value?.message || value?.reason?.message || value?.target?.src || value || "");
                  return text.includes("Failed to fetch dynamically imported module") ||
                    text.includes("Outdated Optimize Dep") ||
                    text.includes("/node_modules/.vite/deps/");
                };
                const recover = (event) => {
                  if (!shouldReload(event)) return;
                  event?.preventDefault?.();
                  const lastReload = Number(sessionStorage.getItem(reloadKey) || 0);
                  if (Date.now() - lastReload < 10000) return;
                  sessionStorage.setItem(reloadKey, String(Date.now()));
                  location.reload();
                };
                window.addEventListener("vite:preloadError", recover);
                window.addEventListener("unhandledrejection", recover);
                window.addEventListener("error", recover, true);
              })();
            `,
          }}
        />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <SiteShell>
          <Outlet />
        </SiteShell>
        <Toaster richColors position="top-center" />
      </LanguageProvider>
    </QueryClientProvider>
  );
}
