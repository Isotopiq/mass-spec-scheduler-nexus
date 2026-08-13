CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  email_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);

CREATE TABLE IF NOT EXISTS email_digests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  frequency TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly')),
  last_sent TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_digests_user ON email_digests(user_id);

-- Ensure notification email templates exist
INSERT INTO email_templates (template_type, subject, html_content)
VALUES
('notification_digest', 'Your Lab Notifications', '<!DOCTYPE html><html><body><div style="text-align:center"><img src="{{logoUrl}}" style="max-height:60px" alt="Lab Logo" /></div><h2>Hello {{userName}}</h2><p>Here are your recent notifications:</p><ul>{{#notifications}}<li><strong>{{title}}</strong>: {{message}}</li>{{/notifications}}</ul><p><a href="{{siteUrl}}">View dashboard</a></p></body></html>'),
('booking_approved', 'Booking Approved', '<!DOCTYPE html><html><body><div style="text-align:center"><img src="{{logoUrl}}" style="max-height:60px" alt="Lab Logo" /></div><h2>Hello {{userName}}</h2><p>Your booking for <strong>{{instrumentName}}</strong> on <strong>{{bookingDate}}</strong> has been approved.</p><p><a href="{{siteUrl}}">View bookings</a></p></body></html>'),
('booking_denied', 'Booking Denied', '<!DOCTYPE html><html><body><div style="text-align:center"><img src="{{logoUrl}}" style="max-height:60px" alt="Lab Logo" /></div><h2>Hello {{userName}}</h2><p>Your booking for <strong>{{instrumentName}}</strong> on <strong>{{bookingDate}}</strong> was denied.</p></body></html>'),
('swap_status', 'Swap Request Updated', '<!DOCTYPE html><html><body><div style="text-align:center"><img src="{{logoUrl}}" style="max-height:60px" alt="Lab Logo" /></div><h2>Hello {{userName}}</h2><p>Your swap request is now <strong>{{status}}</strong>.</p></body></html>'),
('waitlist_filled', 'Waitlist Slot Auto-Booked', '<!DOCTYPE html><html><body><div style="text-align:center"><img src="{{logoUrl}}" style="max-height:60px" alt="Lab Logo" /></div><h2>Hello {{userName}}</h2><p>A slot you were waiting for became available and has been booked for you: <strong>{{instrumentName}}</strong> on <strong>{{bookingDate}}</strong>.</p></body></html>')
ON CONFLICT (template_type) DO NOTHING;
