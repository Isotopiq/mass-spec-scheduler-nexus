GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.schedule_delays TO authenticated;
GRANT ALL ON public.schedule_delays TO service_role;

GRANT SELECT, INSERT ON public.schedule_delay_bookings TO authenticated;
GRANT ALL ON public.schedule_delay_bookings TO service_role;