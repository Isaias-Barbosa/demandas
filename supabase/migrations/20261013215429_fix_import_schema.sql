ALTER TABLE public.demandas
  ADD COLUMN IF NOT EXISTS dados JSONB DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.tipos_demandas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  nome TEXT NOT NULL,
  colunas JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS tipos_demandas_user_id_slug_idx
  ON public.tipos_demandas(user_id, slug);

ALTER TABLE public.tipos_demandas ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tipos_demandas'
      AND policyname = 'Users can view own tipos_demandas'
  ) THEN
    CREATE POLICY "Users can view own tipos_demandas" ON public.tipos_demandas
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tipos_demandas'
      AND policyname = 'Users can insert own tipos_demandas'
  ) THEN
    CREATE POLICY "Users can insert own tipos_demandas" ON public.tipos_demandas
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tipos_demandas'
      AND policyname = 'Users can update own tipos_demandas'
  ) THEN
    CREATE POLICY "Users can update own tipos_demandas" ON public.tipos_demandas
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tipos_demandas'
      AND policyname = 'Users can delete own tipos_demandas'
  ) THEN
    CREATE POLICY "Users can delete own tipos_demandas" ON public.tipos_demandas
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END
$$;

NOTIFY pgrst, 'reload schema';
