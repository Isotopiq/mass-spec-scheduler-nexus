-- Function to prevent overlapping bookings on the same instrument
CREATE OR REPLACE FUNCTION public.prevent_booking_overlap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conflict_count INTEGER;
BEGIN
  -- Skip overlap check if the new/updated booking itself is cancelled or denied
  IF lower(NEW.status) IN ('cancelled', 'denied') THEN
    RETURN NEW;
  END IF;

  -- Look for any other active booking on the same instrument whose time window overlaps
  -- Overlap rule: existing.start < new.end AND existing.end > new.start
  -- Back-to-back bookings (one ends exactly when another starts) are allowed.
  SELECT COUNT(*)
  INTO conflict_count
  FROM public.bookings b
  WHERE b.instrument_id = NEW.instrument_id
    AND b.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND lower(b.status) NOT IN ('cancelled', 'denied')
    AND b.start_time < NEW.end_time
    AND b.end_time > NEW.start_time;

  IF conflict_count > 0 THEN
    RAISE EXCEPTION 'Booking conflict: this instrument is already booked during the selected time window.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

-- Drop old trigger if exists, then create
DROP TRIGGER IF EXISTS bookings_prevent_overlap ON public.bookings;

CREATE TRIGGER bookings_prevent_overlap
BEFORE INSERT OR UPDATE OF start_time, end_time, instrument_id, status ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.prevent_booking_overlap();

-- Helpful index for the overlap lookup
CREATE INDEX IF NOT EXISTS idx_bookings_instrument_time
  ON public.bookings (instrument_id, start_time, end_time);