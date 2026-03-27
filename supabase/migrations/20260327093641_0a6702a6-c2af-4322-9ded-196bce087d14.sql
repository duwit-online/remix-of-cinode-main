
-- Media sources table for Telegram Bridge cached streams
CREATE TABLE public.media_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tmdb_id integer NOT NULL,
  media_type text NOT NULL DEFAULT 'movie',
  season integer,
  episode integer,
  title text,
  stream_url text NOT NULL,
  file_name text,
  source text NOT NULL DEFAULT 'telegram_bridge',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE(tmdb_id, media_type, season, episode, source)
);

ALTER TABLE public.media_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read media sources" ON public.media_sources
  FOR SELECT TO public USING (true);

CREATE POLICY "Admins can manage media sources" ON public.media_sources
  FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger to auto-update updated_at
CREATE TRIGGER update_media_sources_updated_at
  BEFORE UPDATE ON public.media_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Email config table for admin mail settings
CREATE TABLE public.email_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'resend',
  api_key_encrypted text,
  from_email text NOT NULL DEFAULT 'noreply@example.com',
  from_name text NOT NULL DEFAULT 'Cinode',
  smtp_host text,
  smtp_port integer DEFAULT 587,
  smtp_user text,
  smtp_pass_encrypted text,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.email_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage email config" ON public.email_config
  FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
