ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS recurring_bookings_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_template_style TEXT NOT NULL DEFAULT 'card';

UPDATE app_settings
SET recurring_bookings_enabled = false,
    email_template_style = 'card'
WHERE id = '00000000-0000-0000-0000-000000000001';
