# Manual documents with multiple signatures

Each manual upload represents a paper sheet holding many signatures. We record that number at upload time and roll it into the public total, shown alongside the digital count in a second tint.

## Database (live project)

Add one column to `signatures`:

- `manual_signature_count` — integer, default 0, not null.

Rule: digital records always count as 1; manual records count as `manual_signature_count`. Existing manual documents stay at 0 until someone re-records them, so the public total never inflates.

Because the live data lives in the external backend project (not Lovable Cloud), I will give you the exact SQL to run there — same as we did for `referral_sources`.

## Manual upload form (`/admin/manual`)

- New required field: "Number of signatures in this document" (whole number, minimum 1).
- Upload is blocked until it is filled, and the value is saved with the record.
- The admin list shows the count on each document card.
- No inline editing after upload, per your choice.

## Public totals

The stats server function stops using a plain row count and instead returns three numbers: `digitalTotal`, `manualTotal`, and `total` (their sum).

Hero counter on the home page:

- Shows the combined total as the headline figure.
- Beneath it, a small line: "x digital · y from paper petitions", with the manual figure in the secondary/gold tint.

Lamp widget (all three orientations):

- Headline number becomes the combined total.
- The progress bar / ring is split into two segments against the 100,000 goal: the digital share in the existing primary→accent gradient, the manual share in a distinct lighter tint of the same warm palette, so it reads as the same flame, just a second fuel source.
- A one-line legend under the bar in the vertical and circular variants; the compact horizontal (mobile) variant keeps just the two-tone bar to save space.

Design impact is limited to colour segmentation and one extra caption line — no layout or sizing changes, so the mobile top bar and desktop sidebar keep their current footprint.

## Analytics and export

- `/admin/analytics` totals, sunburst counts, and region/country counts weight manual rows by their signature count (a document of 50 contributes 50 to its region).
- The Excel export gains a "Signatures in document" column on the manual tab, and the manual tab shows the weighted total.

## Technical notes

- Schema change is manual SQL against the external project; everything else is code in `src/lib/petition.functions.ts`, `src/lib/admin.functions.ts`, `src/routes/admin.manual.tsx`, `src/routes/admin.analytics.tsx`, `src/routes/index.tsx`, and `src/components/signature-progress-lamp.tsx`.
- Weighting is computed server-side in the stats/analytics handlers so every surface reads one consistent number.
- New tint is added as a design token in `src/styles.css` rather than a hardcoded colour.
