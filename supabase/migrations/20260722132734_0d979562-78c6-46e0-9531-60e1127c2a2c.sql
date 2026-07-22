
CREATE TABLE public.referral_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signature_id uuid,
  source text NOT NULL,
  other_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT referral_sources_source_check
    CHECK (source IN ('facebook','instagram','youtube','twitter','others')),
  CONSTRAINT referral_sources_other_text_check
    CHECK (
      (source = 'others' AND other_text IS NOT NULL AND length(btrim(other_text)) > 0)
      OR (source <> 'others' AND other_text IS NULL)
    )
);

GRANT INSERT ON public.referral_sources TO anon, authenticated;
GRANT ALL ON public.referral_sources TO service_role;

ALTER TABLE public.referral_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert a referral source"
  ON public.referral_sources
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE INDEX referral_sources_signature_id_idx ON public.referral_sources (signature_id);
CREATE INDEX referral_sources_created_at_idx ON public.referral_sources (created_at DESC);
