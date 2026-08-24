-- Plan E: Create the mascot-animations storage bucket (public read)
INSERT INTO storage.buckets (id, name, public)
SELECT 'mascot-animations', 'mascot-animations', true
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'mascot-animations'
);
