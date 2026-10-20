ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS booking_release_timezone TEXT NOT NULL DEFAULT 'UTC';
