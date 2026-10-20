CREATE TABLE IF NOT EXISTS usage_quota_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS usage_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL REFERENCES usage_quota_periods(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  instrument_id UUID REFERENCES instruments(id) ON DELETE CASCADE,
  max_hours NUMERIC(10,2) CHECK (max_hours >= 0 OR max_hours IS NULL),
  max_bookings INTEGER CHECK (max_bookings >= 0 OR max_bookings IS NULL),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usage_quotas_period ON usage_quotas(period_id);
CREATE INDEX IF NOT EXISTS idx_usage_quotas_user ON usage_quotas(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_quotas_instrument ON usage_quotas(instrument_id);
