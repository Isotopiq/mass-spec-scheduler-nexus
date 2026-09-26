CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  department TEXT,
  profile_image TEXT,
  password_hash TEXT NOT NULL,
  last_sign_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  s3_uploads_enabled BOOLEAN NOT NULL DEFAULT false,
  s3_path_prefix TEXT NOT NULL DEFAULT 'lcms-sequences/',
  s3_endpoint_display TEXT,
  s3_bucket_display TEXT,
  max_booking_days_ahead INTEGER NOT NULL DEFAULT 365,
  booking_release_enabled BOOLEAN NOT NULL DEFAULT false,
  booking_release_window_days INTEGER NOT NULL DEFAULT 14,
  booking_release_time TIME NOT NULL DEFAULT '09:00:00',
  booking_release_day_of_week INTEGER,
  booking_release_timezone TEXT NOT NULL DEFAULT 'UTC',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS instruments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT,
  model TEXT,
  location TEXT NOT NULL,
  description TEXT NOT NULL,
  specifications TEXT NOT NULL,
  image TEXT,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance', 'offline')),
  calibration_due TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  instrument_id UUID NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  purpose TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  sequence_file_key TEXT,
  sequence_file_name TEXT,
  sequence_file_size INTEGER,
  sequence_file_uploaded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS maintenance_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument_id UUID NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS smtp_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host TEXT NOT NULL,
  port INTEGER NOT NULL DEFAULT 587,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  from_email TEXT NOT NULL,
  from_name TEXT,
  use_tls BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS status_colors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS schedule_delays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cutoff_time TIMESTAMPTZ NOT NULL,
  delay_minutes INTEGER NOT NULL CHECK (delay_minutes > 0),
  instrument_id UUID REFERENCES instruments(id) ON DELETE SET NULL,
  reason TEXT NOT NULL DEFAULT '',
  applied_by UUID,
  applied_by_name TEXT,
  affected_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'applied',
  reversed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS schedule_delay_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delay_id UUID NOT NULL REFERENCES schedule_delays(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  original_start TIMESTAMPTZ NOT NULL,
  original_end TIMESTAMPTZ NOT NULL,
  new_start TIMESTAMPTZ NOT NULL,
  new_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_instrument_time ON bookings(instrument_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_comments_booking_id ON comments(booking_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_history_instrument_id ON maintenance_history(instrument_id);
CREATE INDEX IF NOT EXISTS idx_schedule_delay_bookings_delay_id ON schedule_delay_bookings(delay_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Seed singleton app settings
INSERT INTO app_settings (id, s3_uploads_enabled, s3_path_prefix, max_booking_days_ahead, booking_release_enabled, booking_release_window_days, booking_release_time, booking_release_day_of_week, booking_release_timezone)
VALUES ('00000000-0000-0000-0000-000000000001', false, 'lcms-sequences/', 365, false, 14, '09:00:00', 1, 'UTC')
ON CONFLICT (id) DO NOTHING;

-- Seed status colors for common statuses
INSERT INTO status_colors (status, color) VALUES
('pending', '#6b7280'),
('confirmed', '#22c55e'),
('cancelled', '#ef4444'),
('completed', '#3b82f6'),
('Not-Started', '#6b7280'),
('In-Progress', '#f59e0b'),
('Delayed', '#f97316'),
('denied', '#ef4444')
ON CONFLICT (status) DO NOTHING;

-- Seed default email templates (include logo header by default so admins can see/edit it)
INSERT INTO email_templates (template_type, subject, html_content) VALUES
('welcome', 'Welcome to Lab Management System, {{userName}}!', '<!DOCTYPE html><html><body><div style="text-align:center"><img src="{{logoUrl}}" style="max-height:60px" alt="Lab Logo" /></div><h1>Welcome, {{userName}}!</h1><p>Your account has been created and you are ready to start managing lab instruments and bookings.</p></body></html>'),
('account_created', 'Your Lab Management System account has been created', '<!DOCTYPE html><html><body><div style="text-align:center"><img src="{{logoUrl}}" style="max-height:60px" alt="Lab Logo" /></div><h1>Your account has been created</h1><p>Dear {{userName}},</p><p>An administrator has created an account for you. You can sign in with the details below.</p><p><strong>Email:</strong> {{userEmail}}<br><strong>Temporary password:</strong> {{temporaryPassword}}</p><p><a href="{{siteUrl}}/login">Sign In</a></p></body></html>'),
('booking_confirmation', 'Booking Confirmation: {{instrumentName}}', '<!DOCTYPE html><html><body><div style="text-align:center"><img src="{{logoUrl}}" style="max-height:60px" alt="Lab Logo" /></div><h1>Booking Confirmed</h1><p>Dear {{userName}},</p><p>Your booking for <strong>{{instrumentName}}</strong> is confirmed.</p><p><strong>Start:</strong> {{startDate}}<br><strong>End:</strong> {{endDate}}</p></body></html>'),
('booking_update', 'Booking Status Update: {{instrumentName}}', '<!DOCTYPE html><html><body><div style="text-align:center"><img src="{{logoUrl}}" style="max-height:60px" alt="Lab Logo" /></div><h1>Booking Status Update</h1><p>Dear {{userName}},</p><p>Your booking for <strong>{{instrumentName}}</strong> has been updated.</p><p><strong>New status:</strong> {{status}}</p></body></html>'),
('booking_delayed', 'Booking Delayed: {{instrumentName}}', '<!DOCTYPE html><html><body><div style="text-align:center"><img src="{{logoUrl}}" style="max-height:60px" alt="Lab Logo" /></div><h1>Booking Delayed</h1><p>Dear {{userName}},</p><p>Your booking for <strong>{{instrumentName}}</strong> has been delayed by {{delayMinutes}} minutes.</p><p><strong>Reason:</strong> {{reason}}</p><p><strong>Previous start:</strong> {{oldStartDate}}<br><strong>New start:</strong> {{newStartDate}}<br><strong>New end:</strong> {{newEndDate}}</p></body></html>'),
('booking_delay_reversed', 'Booking Delay Reversed: {{instrumentName}}', '<!DOCTYPE html><html><body><div style="text-align:center"><img src="{{logoUrl}}" style="max-height:60px" alt="Lab Logo" /></div><h1>Booking Delay Reversed</h1><p>Dear {{userName}},</p><p>The {{delayMinutes}} minute delay for <strong>{{instrumentName}}</strong> has been reversed.</p><p><strong>Delayed start:</strong> {{oldStartDate}}<br><strong>Restored start:</strong> {{newStartDate}}<br><strong>Restored end:</strong> {{newEndDate}}</p></body></html>'),
('comment_notification', 'New Comment on Your Booking: {{instrumentName}}', '<!DOCTYPE html><html><body><div style="text-align:center"><img src="{{logoUrl}}" style="max-height:60px" alt="Lab Logo" /></div><h1>New Comment on Your Booking</h1><p>Dear {{userName}},</p><p>A new comment has been added to your <strong>{{instrumentName}}</strong> booking by {{commentBy}}.</p><p><strong>Comment:</strong> {{commentContent}}</p><p><strong>Booking date:</strong> {{bookingDate}}</p></body></html>')
ON CONFLICT (template_type) DO NOTHING;
