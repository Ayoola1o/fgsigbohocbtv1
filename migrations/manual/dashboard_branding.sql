-- Apply in the Supabase SQL Editor before enabling the dashboard banner upload.
CREATE TABLE IF NOT EXISTS public.dashboard_branding (
  id text PRIMARY KEY CHECK (id = 'global'),
  banner_image text NOT NULL
);

ALTER TABLE public.dashboard_branding ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.dashboard_branding FROM anon, authenticated;
