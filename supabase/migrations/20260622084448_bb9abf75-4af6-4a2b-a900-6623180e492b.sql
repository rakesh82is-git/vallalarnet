
-- 1. Replace PERMISSIVE storage deny policies with RESTRICTIVE ones
DROP POLICY IF EXISTS "private buckets: deny anon/authenticated select" ON storage.objects;
DROP POLICY IF EXISTS "private buckets: deny anon/authenticated insert" ON storage.objects;
DROP POLICY IF EXISTS "private buckets: deny anon/authenticated update" ON storage.objects;
DROP POLICY IF EXISTS "private buckets: deny anon/authenticated delete" ON storage.objects;

CREATE POLICY "private buckets: restrictive deny select"
  ON storage.objects AS RESTRICTIVE FOR SELECT
  TO anon, authenticated
  USING (bucket_id <> ALL (ARRAY['petition-manual'::text, 'gallery'::text, 'campaign-media'::text]));

CREATE POLICY "private buckets: restrictive deny insert"
  ON storage.objects AS RESTRICTIVE FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id <> ALL (ARRAY['petition-manual'::text, 'gallery'::text, 'campaign-media'::text]));

CREATE POLICY "private buckets: restrictive deny update"
  ON storage.objects AS RESTRICTIVE FOR UPDATE
  TO anon, authenticated
  USING (bucket_id <> ALL (ARRAY['petition-manual'::text, 'gallery'::text, 'campaign-media'::text]))
  WITH CHECK (bucket_id <> ALL (ARRAY['petition-manual'::text, 'gallery'::text, 'campaign-media'::text]));

CREATE POLICY "private buckets: restrictive deny delete"
  ON storage.objects AS RESTRICTIVE FOR DELETE
  TO anon, authenticated
  USING (bucket_id <> ALL (ARRAY['petition-manual'::text, 'gallery'::text, 'campaign-media'::text]));

-- 2. Defense-in-depth: explicit RESTRICTIVE policy blocking anonymous role on signatures
CREATE POLICY "signatures: deny anon role"
  ON public.signatures AS RESTRICTIVE FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);
