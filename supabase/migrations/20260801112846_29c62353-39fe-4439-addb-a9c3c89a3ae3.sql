
CREATE POLICY "review images read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'review-images');
CREATE POLICY "review images upload own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'review-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "review images delete own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'review-images' AND (storage.foldername(name))[1] = auth.uid()::text);
