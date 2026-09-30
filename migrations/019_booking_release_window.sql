ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS booking_release_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS booking_release_window_days INTEGER NOT NULL DEFAULT 14,
  ADD COLUMN IF NOT EXISTS booking_release_time TIME NOT NULL DEFAULT '09:00:00',
  ADD COLUMN IF NOT EXISTS booking_release_day_of_week INTEGER;
