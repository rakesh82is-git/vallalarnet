# Vadalur Holy City — Rebuild Plan

Adopt the structure of `vadalur-punithanagaram.vercel.app` with two adjustments you chose:
- Keep our **Digital + Manual** two-tab signing flow on `/sign`.
- Reuse our already-generated images (`sanctuary.jpg`, `thanks.jpg`, `gathering.jpg`, `lamp.jpg`).

## Routes

| Path | Tamil label | Purpose |
|---|---|---|
| `/` | முகப்பு | Hero banner, live counters, "Why Vadalur", testimonials preview, 3-step "How it works", final CTA |
| `/story` | கதை | 3 chapters (Vallalar, Sathya Gnana Sabha, Holy City) + 3 Holy Sites cards |
| `/sign` | கையெழுத்திடுங்கள் | **Two tabs**: Digital (form + mock OTP + signature pad) and Manual (upload + auto-redact) |
| `/wall` | கையொப்பச் சுவர் | Public wall of approved signatures (name, place, message, signature thumbnail) |
| `/analytics` | பகுப்பாய்வு | Goal progress (target 1,00,000), growth chart, recent activity, region split, world list |
| `/gallery` | படத்தொகுப்பு | Tabs: புகைப்படங்கள் / காணொளிகள் / களப் பணிகள் |

Shared `__root.tsx`: top nav with all six links, language switcher **த / EN**, footer.

## Bilingual (TA + EN)

- New `src/i18n/` with `ta.ts` and `en.ts` dictionaries keyed by `home.hero.title`, etc.
- `LanguageProvider` (React context) stores `lang` in `localStorage`, defaults to `ta`.
- `useT()` hook returns the right string. All page copy comes from the dictionaries — no inline strings.
- Switcher in nav toggles between த (Tamil) and EN.

## Backend (Lovable Cloud)

Enable Cloud, then create these tables:

- `signatures` — `id`, `name`, `age`, `phone_hash` (sha256 for one-vote-per-phone, never exposed), `phone_masked`, `country`, `state`, `district`, `message`, `signature_svg` (digital) OR `scan_url` (manual), `kind` ('digital' | 'manual'), `consent` (bool), `created_at`. RLS: public read of safe columns via a `signatures_public` view; insert via server function.
- `gallery_items` — `id`, `kind` ('photo' | 'video' | 'fieldwork'), `title_ta`, `title_en`, `url`, `thumb_url`, `created_at`. Public read.
- Storage buckets: `signatures` (private; manual scans), `gallery` (public).

Server functions in `src/lib/petition.functions.ts`:
- `submitSignature({ kind, ...payload })` — validates with zod, hashes phone, rejects duplicates, inserts.
- `listSignatures({ limit, cursor })` — paginated for `/wall`.
- `getStats()` — totals for counters + analytics (count, distinct districts, distinct countries, daily series, top regions).

Replace localStorage `petition-store.ts` calls with `useServerFn`-wrapped versions. Counters become live across all visitors.

## Sign page (two tabs preserved)

- **Digital tab**: Vallalar signature GIF placeholder + Tamil tagline → form (name, age, +91 phone, country/state/district, 200-char message, consent question "வடலூர் புனித நகரம் ஆவதற்கு உங்களுக்கு சம்மதமா?") → mock 6-digit OTP step → signature pad → submit → thank-you screen (thanks.jpg) with live vote count and share buttons.
- **Manual tab**: drop image → in-browser auto-redact (drag rectangles, canvas blur) → preview → upload only the blurred version to `signatures` bucket → success.

## Gallery

Three tabs filter `gallery_items` by `kind`. Seed migration inserts placeholder rows pointing at our existing assets so the page isn't empty pre-launch. Lightbox on click.

## Analytics

Single server function `getStats()` returns everything. Render:
- Progress bar to 1,00,000.
- Line chart (recharts) of cumulative signatures by day.
- Recent activity list (last 8 signatures: name + district + relative time).
- Top districts/states bar list.
- Simple "Worldwide signers" country list (no map library to keep bundle small; we can add `react-simple-maps` later if you want a real world map).

## Design

Same warm ivory + saffron + gold tokens we already shipped. Hind Madurai + Noto Sans Tamil. No visual regressions on the home page beyond layout.

## Technical notes

- New deps: `recharts` for analytics chart. (`react-signature-canvas`, `react-dropzone` already added.)
- One Supabase migration creates tables, view, RLS policies, GRANTs, storage buckets + policies, and seeds gallery rows.
- Mock OTP stays client-side (any 6 digits) until you ask for real SMS — at which point we wire Twilio via a connector and swap the mock step.
- Phone uniqueness enforced server-side by `phone_hash` unique index. Mask shown publicly is `+91 •••••• 1234`.

## Out of scope (call out)

- Real SMS OTP (mock until you say go).
- Admin moderation queue for the Wall (everything auto-publishes for now; we can add a `status` column later).
- Multi-language beyond TA/EN.
- Real map visualization (list view only, swap later).

Proceed?
