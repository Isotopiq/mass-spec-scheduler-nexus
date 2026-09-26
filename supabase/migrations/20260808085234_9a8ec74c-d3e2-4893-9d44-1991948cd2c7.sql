CREATE TABLE public.schedule_delays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cutoff_time timestamptz NOT NULL,
  delay_minutes integer NOT NULL CHECK (delay_minutes > 0),
  instrument_id uuid REFERENCES public.instruments(id) ON DELETE SET NULL,
  reason text NOT NULL DEFAULT '',
  applied_by uuid,
  applied_by_name text,
  affected_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'applied',
  reversed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.schedule_delays TO authenticated;
GRANT ALL ON public.schedule_delays TO service_role;

ALTER TABLE public.schedule_delays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view schedule delays"
  ON public.schedule_delays FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can create schedule delays"
  ON public.schedule_delays FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update schedule delays"
  ON public.schedule_delays FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.schedule_delay_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delay_id uuid NOT NULL REFERENCES public.schedule_delays(id) ON DELETE CASCADE,
  booking_id uuid NOT NULL,
  original_start timestamptz NOT NULL,
  original_end timestamptz NOT NULL,
  new_start timestamptz NOT NULL,
  new_end timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_schedule_delay_bookings_delay_id ON public.schedule_delay_bookings(delay_id);

GRANT SELECT, INSERT ON public.schedule_delay_bookings TO authenticated;
GRANT ALL ON public.schedule_delay_bookings TO service_role;

ALTER TABLE public.schedule_delay_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view delay booking records"
  ON public.schedule_delay_bookings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can create delay booking records"
  ON public.schedule_delay_bookings FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_schedule_delays_updated_at
  BEFORE UPDATE ON public.schedule_delays
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();