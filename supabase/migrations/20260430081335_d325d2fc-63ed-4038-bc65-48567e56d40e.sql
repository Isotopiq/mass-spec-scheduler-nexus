-- App settings (singleton)
CREATE TABLE public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  s3_uploads_enabled boolean NOT NULL DEFAULT false,
  s3_path_prefix text NOT NULL DEFAULT 'lcms-sequences/',
  s3_endpoint_display text,
  s3_bucket_display text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view app settings"
  ON public.app_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can insert app settings"
  ON public.app_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can update app settings"
  ON public.app_settings FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Seed singleton row
INSERT INTO public.app_settings (s3_uploads_enabled, s3_path_prefix)
VALUES (false, 'lcms-sequences/');

-- Add sequence file columns to bookings
ALTER TABLE public.bookings
  ADD COLUMN sequence_file_key text,
  ADD COLUMN sequence_file_name text,
  ADD COLUMN sequence_file_size integer,
  ADD COLUMN sequence_file_uploaded_at timestamptz;