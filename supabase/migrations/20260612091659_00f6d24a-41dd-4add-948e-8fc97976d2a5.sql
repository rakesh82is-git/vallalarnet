
ALTER TABLE public.signatures ADD COLUMN IF NOT EXISTS mobile_number text;
ALTER TABLE public.signatures ADD COLUMN IF NOT EXISTS manual_document_url text;
ALTER TABLE public.signatures ADD COLUMN IF NOT EXISTS document_title text;

CREATE UNIQUE INDEX IF NOT EXISTS signatures_mobile_number_unique
  ON public.signatures (mobile_number)
  WHERE mobile_number IS NOT NULL;

DROP POLICY IF EXISTS "Authenticated users can insert their signature" ON public.signatures;
DROP POLICY IF EXISTS "Users can read own signature" ON public.signatures;
