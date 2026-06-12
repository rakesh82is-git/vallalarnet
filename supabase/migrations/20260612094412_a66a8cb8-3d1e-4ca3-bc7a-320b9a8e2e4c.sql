
-- Deny-by-default RLS policies on storage.objects for the private 'petition-manual' bucket.
-- Only the service role (used by our server functions) may touch these objects.

DROP POLICY IF EXISTS "petition-manual: deny anon/authenticated select" ON storage.objects;
DROP POLICY IF EXISTS "petition-manual: deny anon/authenticated insert" ON storage.objects;
DROP POLICY IF EXISTS "petition-manual: deny anon/authenticated update" ON storage.objects;
DROP POLICY IF EXISTS "petition-manual: deny anon/authenticated delete" ON storage.objects;

CREATE POLICY "petition-manual: deny anon/authenticated select"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id <> 'petition-manual');

CREATE POLICY "petition-manual: deny anon/authenticated insert"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id <> 'petition-manual');

CREATE POLICY "petition-manual: deny anon/authenticated update"
  ON storage.objects FOR UPDATE
  TO anon, authenticated
  USING (bucket_id <> 'petition-manual')
  WITH CHECK (bucket_id <> 'petition-manual');

CREATE POLICY "petition-manual: deny anon/authenticated delete"
  ON storage.objects FOR DELETE
  TO anon, authenticated
  USING (bucket_id <> 'petition-manual');
