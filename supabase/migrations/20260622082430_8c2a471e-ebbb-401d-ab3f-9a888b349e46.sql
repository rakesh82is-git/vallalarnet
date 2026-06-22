
-- Remove public/anon read access to signatures (contains PII)
REVOKE SELECT ON public.signatures FROM anon;
REVOKE SELECT ON public.signatures FROM authenticated;
GRANT SELECT, INSERT ON public.signatures TO authenticated;
GRANT ALL ON public.signatures TO service_role;

-- Drop public-facing view that exposed signatures to anon
DROP VIEW IF EXISTS public.signatures_public;

-- Drop any lingering permissive policies
DROP POLICY IF EXISTS "Signatures are publicly readable" ON public.signatures;
DROP POLICY IF EXISTS "Public can read signatures" ON public.signatures;

-- Ensure RLS is enabled
ALTER TABLE public.signatures ENABLE ROW LEVEL SECURITY;

-- Add a policy so the table is not "RLS enabled, no policy".
-- Authenticated users may read only their own row; admin access goes
-- through service_role (bypasses RLS).
CREATE POLICY "Users can read own signature"
  ON public.signatures
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their signature"
  ON public.signatures
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
