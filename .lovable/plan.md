## Goal
Add a required "How did you hear about us?" radio group on the "Sign to confirm" dialog (between the declaration and the signature pad). Disable Submit until a valid choice is made. Store the answer in a **new, separate analytics table** — `signatures` is untouched.

## Options (bilingual EN + TA via `src/i18n/dict.ts`)
- Facebook
- Instagram
- YouTube
- Twitter (X)
- Others → reveals a required text input (trimmed, max 200 chars)

## New table (single migration)
`public.referral_sources`
- `id uuid PK default gen_random_uuid()`
- `signature_id uuid NULL` — soft link to `signatures.id` (no FK, so referral capture never blocks a signature insert and stays decoupled for analytics)
- `source text NOT NULL` — enum-checked: `facebook | instagram | youtube | twitter | others`
- `other_text text NULL` — required (non-empty) when `source='others'`, else null (CHECK)
- `created_at timestamptz NOT NULL default now()`

Grants + RLS:
- `GRANT INSERT ON public.referral_sources TO anon, authenticated;`
- `GRANT ALL ON public.referral_sources TO service_role;`
- Enable RLS. Policy: `INSERT` allowed to `anon` + `authenticated` (matches how signatures are captured). No public SELECT — admin/analytics read via service role.

## Server (`src/lib/petition.functions.ts`)
1. Extend `DigitalSignaturePayload` with optional `referral_source` (enum) and `referral_other` (string, max 200), enforcing "others ⇒ non-empty text" in `.refine`.
2. In `submitDigitalSignature.handler`, after the signature row is inserted successfully, best-effort insert into `referral_sources` with the returned `signature_id`. Wrap in try/catch — failures are logged but do NOT fail the signature submission (analytics is non-critical, per user).

## Frontend (`src/routes/sign.tsx`)
1. Add `referral` state (`'' | 'facebook' | 'instagram' | 'youtube' | 'twitter' | 'others'`) and `referralOther` string. Reset in `resetForm` and after success.
2. In the Sign dialog, between the declaration box and `<SignaturePad>`, render a shadcn `<RadioGroup>` with the 5 options. When `others` is selected, render an `<Input>` beneath (autofocus).
3. Update the Submit button `disabled` to also require: `referral !== ''` AND (`referral !== 'others'` OR `referralOther.trim().length > 0`).
4. Pass `referral_source` + `referral_other` into the `submitDigitalSignature` call.

## Out of scope
- Capturing referral for manual (admin) uploads
- Admin analytics UI / Excel column for referral (can follow later)

Ready to implement on approval.
