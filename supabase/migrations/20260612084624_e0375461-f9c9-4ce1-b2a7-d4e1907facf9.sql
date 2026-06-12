
ALTER TABLE public.signatures
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS residential_address text,
  ADD COLUMN IF NOT EXISTS pincode text,
  ADD COLUMN IF NOT EXISTS signature_image text,
  ADD COLUMN IF NOT EXISTS user_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS signatures_email_unique ON public.signatures (email) WHERE email IS NOT NULL;

ALTER TABLE public.signatures ALTER COLUMN kind DROP NOT NULL;
ALTER TABLE public.signatures ALTER COLUMN name DROP NOT NULL;
ALTER TABLE public.signatures ALTER COLUMN age DROP NOT NULL;
ALTER TABLE public.signatures ALTER COLUMN country DROP NOT NULL;
ALTER TABLE public.signatures ALTER COLUMN state DROP NOT NULL;
ALTER TABLE public.signatures ALTER COLUMN district DROP NOT NULL;
ALTER TABLE public.signatures ALTER COLUMN phone_hash DROP NOT NULL;
ALTER TABLE public.signatures ALTER COLUMN phone_masked DROP NOT NULL;

GRANT INSERT, SELECT ON public.signatures TO authenticated;

DROP POLICY IF EXISTS "Authenticated users can insert their signature" ON public.signatures;
CREATE POLICY "Authenticated users can insert their signature"
  ON public.signatures
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND auth.email() = email);
