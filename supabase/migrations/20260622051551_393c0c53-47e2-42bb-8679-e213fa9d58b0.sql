CREATE TABLE public.campaign_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_en text,
  title_ta text,
  content_en text,
  content_ta text,
  media_url text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  is_pinned boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.campaign_updates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_updates TO authenticated;
GRANT ALL ON public.campaign_updates TO service_role;

ALTER TABLE public.campaign_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published updates are public"
  ON public.campaign_updates
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

CREATE INDEX campaign_updates_pinned_created_idx
  ON public.campaign_updates (is_pinned DESC, created_at DESC);