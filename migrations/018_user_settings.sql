ALTER TABLE profiles ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS two_factor_secret TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS calendar_sync_token TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_profiles_settings ON profiles USING GIN (settings);
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_calendar_sync_token ON profiles(calendar_sync_token) WHERE calendar_sync_token IS NOT NULL;
