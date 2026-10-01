-- rollback لـ quicktest_matching_add_image.sql
ALTER TABLE public.quicktest_matching_pairs
  DROP COLUMN IF EXISTS image_url;

NOTIFY pgrst, 'reload schema';
