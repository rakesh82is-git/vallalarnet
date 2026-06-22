ALTER TABLE public.campaign_updates
  ADD COLUMN IF NOT EXISTS gallery_item_id uuid REFERENCES public.gallery_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS external_url text;