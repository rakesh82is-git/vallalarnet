// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      {
        name: "stale-vite-dep-chunk-fallback",
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (!req.url?.startsWith("/node_modules/.vite/deps/chunk-KCFY4DTJ.js")) {
              next();
              return;
            }
            res.statusCode = 200;
            res.setHeader("Content-Type", "text/javascript");
            try {
              res.end(await readFile(join(process.cwd(), "node_modules/.vite/deps/chunk-KCFY4DTJ.js"), "utf8"));
            } catch {
              res.end("export {};\n");
            }
          });
        },
      },
    ],
    optimizeDeps: {
      // In preview, an already-open tab can request an optimized dependency URL
      // from the previous dev-server cache. Let Vite serve the current file
      // instead of returning a blank-screen-causing 504 for that stale URL.
      ignoreOutdatedRequests: true,
      // 17MB dataset — Vite's prebundler times out trying to scan it. Load as-is.
      exclude: ["country-state-city"],
    },
  },
});
