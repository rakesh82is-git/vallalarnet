-- Drop the overly permissive public SELECT policy that exposed all PII
DROP POLICY IF EXISTS "Signatures are publicly readable" ON public.signatures;

-- Allow authenticated users to read only their own signature row
CREATE POLICY "Users can read own signature"
  ON public.signatures
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
