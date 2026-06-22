
CREATE TABLE public.fieldwork_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_ta text NOT NULL,
  title_en text NOT NULL,
  caption_ta text,
  caption_en text,
  event_date date,
  location text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.fieldwork_events TO anon, authenticated;
GRANT ALL ON public.fieldwork_events TO service_role;

ALTER TABLE public.fieldwork_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fieldwork events are public"
  ON public.fieldwork_events FOR SELECT
  USING (true);

ALTER TABLE public.gallery_items
  ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.fieldwork_events(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS gallery_items_event_id_idx
  ON public.gallery_items(event_id);

ALTER TABLE public.campaign_updates
  ADD COLUMN IF NOT EXISTS fieldwork_event_id uuid REFERENCES public.fieldwork_events(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS campaign_updates_fieldwork_event_id_idx
  ON public.campaign_updates(fieldwork_event_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_fieldwork_events_updated_at
  BEFORE UPDATE ON public.fieldwork_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
