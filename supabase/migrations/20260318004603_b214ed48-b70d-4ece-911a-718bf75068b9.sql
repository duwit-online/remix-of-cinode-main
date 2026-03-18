
CREATE TABLE public.streaming_servers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  server_type text NOT NULL DEFAULT 'jellyfin',
  server_url text NOT NULL,
  api_key_encrypted text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.streaming_servers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage servers"
  ON public.streaming_servers FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can read servers"
  ON public.streaming_servers FOR SELECT
  TO service_role
  USING (true);
