# Vallalar.net redesign — petition flow (demo build)

A three-route Tamil-first site asking the world to declare Vadalur a holy city. Everything is front-end only: signatures, OTP, vote counts and uploads live in browser memory (`localStorage`) so the flow feels real for a design preview, but nothing persists server-side.

## Routes

```text
src/routes/
  __root.tsx           shared shell: top nav (முகப்பு · கையொப்பம் · படத்தொகுப்பு), footer
  index.tsx            Home — hero image + 20 lines of Tamil intro copy
  signature.tsx        Signature page with two tabs
  gallery.tsx          Photos & videos grid
```

Each route gets its own `head()` with unique Tamil title + description + og tags.

## 1. Home (`/`)

- Reuses the existing `sanctuary.jpg` as a full-bleed hero with the warm saffron glow already in `styles.css`.
- Title: **அருட்பெருஞ்ஜோதி — வடலூர் புனித நகரம்**
- Body: ~20 lines of placeholder Tamil prose I'll draft, framed in two columns on desktop, single column on mobile. Tone: reverent, inviting, ending with a clear CTA → "உங்கள் கையொப்பம் இடுங்கள்" button that links to `/signature`.
- Live signature count chip ("இதுவரை N கையொப்பங்கள்") pulled from `localStorage` so the home page reacts as signatures grow.

## 2. Signature page (`/signature`)

Tabbed UI (shadcn `Tabs`). Two tabs: **டிஜிட்டல் கையொப்பம்** and **கையால் எழுதிய கையொப்பம்**.

### A. Digital Signature tab

Step 1 — Intro panel
- Animated Vallalar signature GIF placeholder (I'll generate a stylised "வள்ளலார்" calligraphic SVG that animates its stroke; if you have a real GIF, drop it in later).
- Catchy Tamil tagline above the form.

Step 2 — Details form (zod-validated)
- பெயர் (Name)
- வயது (Age)
- நாடு / மாநிலம் / மாவட்டம் (Country / State / District — dropdowns, India pre-loaded, other countries as free text)
- கைபேசி எண் (Mobile, with country code)
- Consent question rendered as a required Yes/No radio:
  **"வடலூர் புனித நகரம் ஆவதற்கு உங்களுக்கு சம்மதமா?"** (ஆம் / இல்லை)

Step 3 — Mock OTP
- After submit, show a modal: "உங்கள் எண்ணுக்கு குறியீடு அனுப்பப்பட்டது". Any 6-digit code is accepted (we display a hint that this is a demo).
- Enforce one-vote-per-phone by checking the number against `localStorage` before sending OTP. Duplicate → friendly Tamil message.

Step 4 — Signature pad
- `react-signature-canvas` for drawing the signature with a finger / mouse.

Step 5 — Success state
- Joyful "animals with Vallalar" thank-you illustration (I'll generate a bright, heavenly scene of deer/peacock/cow around Vallalar with floating hearts — placeholder for now, you can swap to a real GIF later).
- Big number: **"நீங்கள் #N-ஆவது கையொப்பமிட்டவர்"** plus the running total.
- Share buttons (WhatsApp + copy link) generated as `wa.me` deep links — no Twilio needed.

### B. Manual Signature tab

- Upload zone (drag-drop or click) accepting JPG/PNG/PDF of a physically signed page.
- **Auto-blur**: the uploaded image is drawn to a `<canvas>`, the user is shown a simple rectangle tool to drag boxes over phone/address regions; those rectangles are rasterised with a strong Gaussian blur before the image is saved. Pre-blur preview shown so they can confirm.
- Saved scans appear in a grid below the upload zone (read from `localStorage`), with a lightbox viewer. Only the blurred version is ever stored or displayed.
- Clear Tamil notice explaining the demo nature + privacy guidance.

## 3. Gallery (`/gallery`)

- Masonry grid of event photos + videos. Seeded with 6–8 placeholder slots using generated heavenly Vadalur-themed imagery (I'll create 2–3 fresh ones, reuse `sanctuary.jpg`).
- Video tiles use native `<video>` with poster frames; you can later replace the `src` with real YouTube embeds.
- Lightbox on click for photos; inline play for videos.

## Design language (carries from previous build)

- Same warm ivory + saffron palette already in `src/styles.css`.
- Hind Madurai + Noto Sans Tamil for Tamil, JetBrains Mono for the count numerals.
- New tokens added for: success-green (thank-you state), petition card surface, blur-mask overlay.
- All buttons/inputs/tabs through shadcn variants so the theme stays consistent.

## Technical notes

- New deps: `react-signature-canvas`, `react-dropzone`, `zod` (already present), `react-hook-form` (likely already present).
- A small `src/lib/petition-store.ts` wraps `localStorage` with a typed API: `addSignature`, `getCount`, `hasPhone`, `addManualScan`, `listManualScans`. Swappable for a real backend later.
- Auto-blur done client-side with canvas `filter: blur(20px)` over user-drawn rectangles, then `toBlob('image/jpeg')` so the original pixels are gone before storage.
- Everything stays SSR-safe — storage reads are wrapped in `useEffect`.

## What I'll need from you later (not blocking)

1. Final Tamil copy for the 20-line home intro (I'll ship a draft you can edit in place).
2. Real Vallalar signature GIF + "animals thanking" GIF when you have them — placeholders go in now.
3. Real event photos/videos for the gallery.
4. When you're ready to go live with real votes: say the word and we enable Lovable Cloud + Twilio (or email OTP) and migrate the `petition-store` calls to server functions — UI stays the same.

## Out of scope for this iteration

- Real persistence, real OTP, real one-vote-per-person enforcement across devices.
- Admin moderation tools.
- Multi-language site (stays Tamil-first; English meta only).
