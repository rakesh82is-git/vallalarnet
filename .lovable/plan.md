# Attract Visitors to /sign

Two coordinated call-to-action treatments, both in the existing saffron/amber Vadalur palette (no new hues).

## 1. Burning "Sign" nav link
- In `src/routes/__root.tsx`, give the `/sign` entry in the NAV list special styling (both desktop and mobile nav rows).
- Add a flame-inspired CSS animation in `src/styles.css`: a soft radial ember glow behind the text using `--primary` (saffron) and `--manual`/`--accent` (amber), with a subtle flicker keyframe (opacity/scale/translate, like a lamp flame). Text stays in theme colors — no new colors, no black.
- Include a `@media (prefers-reduced-motion)` fallback that keeps a static warm glow.

## 2. Floating "Sign here" button
- New component `src/components/sign-cta-floater.tsx`:
  - Fixed to the right edge of the viewport, vertically centered, always visible (above content, below the sticky nav z-index).
  - A pill/ribbon button with the lamp-flame glow styling, label from i18n dict ("Sign here" / Tamil equivalent — add key to `src/i18n/dict.ts`), linking to `/sign`.
  - Hidden on the `/sign` route itself (redundant there) and on `/admin` pages; visible on all other pages, all screen sizes.
  - On mobile, slightly smaller so it doesn't cover content; respects the bottom Campaign Updates sheet.
  - Gentle idle float/pulse animation (reduced-motion safe).
- Mounted once in `__root.tsx` inside `SiteShell`.

## Technical notes
- Pure CSS keyframe animations (no new dependencies).
- Reuses existing semantic tokens: `primary`, `accent`, `manual`, `primary-foreground`.
- Hidden via `useRouterState` pathname check (`/sign`, `/admin*`).
- Bilingual labels via `useLang()` / `t`.
- Both treatments share one `@utility` glow/flicker definition in `src/styles.css`.
