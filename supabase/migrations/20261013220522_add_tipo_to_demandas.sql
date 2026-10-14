ALTER TABLE public.demandas
  ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'corretivas';

NOTIFY pgrst, 'reload schema';
