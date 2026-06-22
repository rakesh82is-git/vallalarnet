-- Restrict direct anon/authenticated access to private buckets (gallery, campaign-media)
-- Mirrors the existing petition-manual lockdown. App reads via signed URLs / service role.

DROP POLICY IF EXISTS "petition-manual: deny anon/authenticated select" ON storage.objects;
DROP POLICY IF EXISTS "petition-manual: deny anon/authenticated insert" ON storage.objects;
DROP POLICY IF EXISTS "petition-manual: deny anon/authenticated update" ON storage.objects;
DROP POLICY IF EXISTS "petition-manual: deny anon/authenticated delete" ON storage.objects;

CREATE POLICY "private buckets: deny anon/authenticated select"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id NOT IN ('petition-manual', 'gallery', 'campaign-media'));

CREATE POLICY "private buckets: deny anon/authenticated insert"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id NOT IN ('petition-manual', 'gallery', 'campaign-media'));

CREATE POLICY "private buckets: deny anon/authenticated update"
ON storage.objects FOR UPDATE TO anon, authenticated
USING (bucket_id NOT IN ('petition-manual', 'gallery', 'campaign-media'))
WITH CHECK (bucket_id NOT IN ('petition-manual', 'gallery', 'campaign-media'));

CREATE POLICY "private buckets: deny anon/authenticated delete"
ON storage.objects FOR DELETE TO anon, authenticated
USING (bucket_id NOT IN ('petition-manual', 'gallery', 'campaign-media'));