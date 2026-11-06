CREATE TABLE IF NOT EXISTS booking_swaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  recipient_booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  requester_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'approved', 'denied', 'cancelled')),
  admin_notes TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_swaps_requester ON booking_swaps(requester_user_id);
CREATE INDEX IF NOT EXISTS idx_booking_swaps_recipient ON booking_swaps(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_booking_swaps_status ON booking_swaps(status);

CREATE TABLE IF NOT EXISTS booking_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  instrument_id UUID NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  purpose TEXT,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'filled', 'cancelled', 'expired')),
  filled_booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_waitlist_user ON booking_waitlist(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_waitlist_instrument ON booking_waitlist(instrument_id);
CREATE INDEX IF NOT EXISTS idx_booking_waitlist_status ON booking_waitlist(status);
CREATE INDEX IF NOT EXISTS idx_booking_waitlist_time ON booking_waitlist(instrument_id, start_time, end_time);
