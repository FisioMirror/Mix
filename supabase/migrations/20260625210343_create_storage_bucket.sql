/*
# Create storage bucket for clinical documents

1. Storage
- Create public bucket 'documentos' for OCR prescription images.
- Public read so the edge function can fetch the image URL.

2. Notes
- Idempotent via IF NOT EXISTS check on storage.buckets.
*/

INSERT INTO storage.buckets (id, name, public)
SELECT 'documentos', 'documentos', true
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'documentos');

DROP POLICY IF EXISTS "public_upload_documentos" ON storage.objects;
CREATE POLICY "public_upload_documentos" ON storage.objects FOR INSERT
  TO anon, authenticated WITH CHECK (bucket_id = 'documentos');

DROP POLICY IF EXISTS "public_read_documentos" ON storage.objects;
CREATE POLICY "public_read_documentos" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'documentos');

DROP POLICY IF EXISTS "public_delete_documentos" ON storage.objects;
CREATE POLICY "public_delete_documentos" ON storage.objects FOR DELETE
  TO anon, authenticated USING (bucket_id = 'documentos');
