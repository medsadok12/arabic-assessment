-- rollback لـ marketing_leads_add_answers.sql — آمن للتشغيل في أي وقت
-- (عمود إضافي بحت، لا قيود/فهارس أخرى تعتمد عليه).

ALTER TABLE public.marketing_leads
  DROP COLUMN IF EXISTS answers;

NOTIFY pgrst, 'reload schema';
