import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { LanguageProvider, useLang } from "@/i18n/context";
import { CampaignUpdatesDrawer } from "@/components/campaign-updates-drawer";
import { SignatureProgressLamp } from "@/components/signature-progress-lamp";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", key: "home" },
  { to: "/story", key: "story" },
  { to: "/sign", key: "sign" },
  { to: "/wall", key: "wall" },
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
  // Default closed on mobile (bottom sheet is hidden by default). Open by default on desktop.
  const [isFeedOpen, setIsFeedOpen] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      setIsFeedOpen(true);
    }
  }, []);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Hide the global newsfeed on admin pages to keep the admin tooling uncluttered.
  const showFeed = !pathname.startsWith("/admin");
  const footerRef = useRef<HTMLElement>(null);
  const [footerVisible, setFooterVisible] = useState(false);
  useEffect(() => {
    const el = footerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => setFooterVisible(entry.isIntersecting),
      { threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
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
        {showFeed && (
          <div className="lg:hidden border-t border-border bg-background/80">
            <div className="max-w-6xl mx-auto px-4 py-2">
              <SignatureProgressLamp orientation="horizontal" />
            </div>
          </div>
        )}
      </nav>
      <main className="flex-1">
        {showFeed ? (
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
            <div className="flex flex-col lg:flex-row gap-8 transition-all duration-500 ease-in-out">
              <div className={cn("min-w-0 transition-all duration-500 ease-in-out", isFeedOpen ? "lg:w-2/3" : "lg:flex-1")}>
                {children}
              </div>
              {/* On lg+ the drawer flows inline next to content. On mobile/tablet it
                  floats fixed at the bottom of the viewport until the footer scrolls in. */}
              <div
                className={cn(
                  "fixed inset-x-0 bottom-0 z-30 px-2 pb-2 pointer-events-none",
                  "transition-transform duration-300 ease-in-out",
                  footerVisible ? "translate-y-full" : "translate-y-0",
                  "lg:static lg:p-0 lg:translate-y-0 lg:block lg:transition-all lg:duration-500",
                  isFeedOpen ? "lg:w-1/3" : "lg:w-12",
                )}
              >
                <div
                  className={cn(
                    "pointer-events-auto mx-auto max-w-2xl lg:max-w-none lg:mx-0 lg:flex lg:flex-col lg:gap-4 lg:w-full",
                  )}
                >
                  {isFeedOpen && (
                    <SignatureProgressLamp
                      orientation="circular"
                      className="hidden lg:flex"
                    />
                  )}
                  <CampaignUpdatesDrawer
                    isOpen={isFeedOpen}
                    onToggle={() => setIsFeedOpen((v) => !v)}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          children
        )}
      </main>
      <footer ref={footerRef} className="border-t border-border py-8 px-6 mt-16">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-muted-foreground">
          <div className="font-display font-bold text-primary text-sm">அருட்பெருஞ்ஜோதி</div>
          <div className="font-mono uppercase tracking-widest text-center">
            {t.footer.line}
          </div>
          <div className="flex items-center gap-4 font-mono uppercase tracking-widest">
            <span>தனிப்பெருங்கருணை</span>
            <Link
              to="/admin"
              className="text-muted-foreground/70 hover:text-primary transition-colors"
            >
              Admin
            </Link>
          </div>
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
    const message = String(error?.message || error || "");
    const isStaleDevModule =
      message.includes("Failed to fetch dynamically imported module") ||
      message.includes("Outdated Optimize Dep") ||
      message.includes("/node_modules/.vite/deps/");
    if (isStaleDevModule) {
      const reloadKey = "vallalarnet:stale-route-reload";
      const lastReload = Number(sessionStorage.getItem(reloadKey) || 0);
      if (Date.now() - lastReload > 10000) {
        sessionStorage.setItem(reloadKey, String(Date.now()));
        location.reload();
        return;
      }
    }
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
      { rel: "icon", href: "/favicon.ico" },
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
