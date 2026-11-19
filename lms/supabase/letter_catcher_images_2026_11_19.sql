-- Image-only release for the 272 reviewed Letter Catcher words.
-- Exact old/new URL guard prevents overwriting later teacher edits.
BEGIN;
LOCK TABLE public.letter_catcher_words IN SHARE ROW EXCLUSIVE MODE;
CREATE TEMP TABLE lc_image_release(id uuid PRIMARY KEY, word text, missing_letter text, category text, old_image_url text, new_image_url text) ON COMMIT DROP;
-- Insert the private 272-row release payload here, inside this transaction.
-- Source URLs and vocabulary snapshots are intentionally excluded from Git.
-- Without the private payload, the guard below aborts before any update.
CREATE TEMP TABLE lc_image_content_before ON COMMIT DROP AS
SELECT id, to_jsonb(w) - 'image_url' - 'updated_at' AS content FROM public.letter_catcher_words w;
DO $release$
DECLARE eligible integer;
BEGIN
 SELECT count(*) INTO eligible FROM public.letter_catcher_words w JOIN lc_image_release r USING(id)
 WHERE w.word=r.word AND w.missing_letter=r.missing_letter AND w.category IS NOT DISTINCT FROM r.category
 AND w.image_url IS NOT DISTINCT FROM r.old_image_url;
 IF eligible<>272 THEN RAISE EXCEPTION 'Expected 272 unchanged target words, found %; no image changes applied',eligible; END IF;
END $release$;
UPDATE public.letter_catcher_words w SET image_url=r.new_image_url FROM lc_image_release r WHERE w.id=r.id;
DO $verify$
BEGIN
 IF EXISTS(SELECT 1 FROM public.letter_catcher_words w JOIN lc_image_content_before b USING(id)
   WHERE to_jsonb(w)-'image_url'-'updated_at' IS DISTINCT FROM b.content)
 THEN RAISE EXCEPTION 'A non-image word field changed; rolling back'; END IF;
END $verify$;
SELECT count(*) AS verified_images FROM public.letter_catcher_words w JOIN lc_image_release r USING(id) WHERE w.image_url=r.new_image_url;
COMMIT;
