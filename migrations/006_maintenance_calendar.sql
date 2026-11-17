CREATE TABLE IF NOT EXISTS instrument_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument_id UUID NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  type TEXT NOT NULL DEFAULT 'maintenance' CHECK (type IN ('maintenance', 'calibration', 'repair')),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_instrument_maintenance_instrument ON instrument_maintenance(instrument_id);
CREATE INDEX IF NOT EXISTS idx_instrument_maintenance_time ON instrument_maintenance(instrument_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_instrument_maintenance_status ON instrument_maintenance(status);
