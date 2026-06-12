// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

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
          server.middlewares.use((req, res, next) => {
            if (!req.url?.startsWith("/node_modules/.vite/deps/chunk-KCFY4DTJ.js")) {
              next();
              return;
            }
            res.statusCode = 200;
            res.setHeader("Content-Type", "text/javascript");
            res.end(`
              export * from "/node_modules/.vite/deps/chunk-5M7U64OP.js?v=65461d16";
              export * from "/node_modules/.vite/deps/chunk-6WBQ3PW6.js?v=65461d16";
              export * from "/node_modules/.vite/deps/chunk-BEDQLYDE.js?v=65461d16";
              export * from "/node_modules/.vite/deps/chunk-BPGYRLWZ.js?v=65461d16";
              export * from "/node_modules/.vite/deps/chunk-EKTAS3OU.js?v=65461d16";
              export * from "/node_modules/.vite/deps/chunk-FMHSZV5P.js?v=65461d16";
              export * from "/node_modules/.vite/deps/chunk-G3PMV62Z.js?v=65461d16";
              export * from "/node_modules/.vite/deps/chunk-GNQBU2FN.js?v=65461d16";
              export * from "/node_modules/.vite/deps/chunk-KA7Q37B3.js?v=65461d16";
              export * from "/node_modules/.vite/deps/chunk-LOG2ZSQO.js?v=65461d16";
              export * from "/node_modules/.vite/deps/chunk-O7XYRGWP.js?v=65461d16";
              export * from "/node_modules/.vite/deps/chunk-Q6YWI74T.js?v=65461d16";
              export * from "/node_modules/.vite/deps/chunk-SZINW6JV.js?v=65461d16";
              export * from "/node_modules/.vite/deps/chunk-U7P2NEEE.js?v=65461d16";
            `);
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
