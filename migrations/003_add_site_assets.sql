ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS favicon_url TEXT;

UPDATE app_settings
SET
  logo_url = '/site-assets/40965317-613a-41b7-bc11-d9e8b6cba9ae.png',
  favicon_url = '/site-assets/c9351e76-a090-4113-bffa-7ee6800178c0.png'
WHERE id = '00000000-0000-0000-0000-000000000001'
  AND logo_url IS NULL;
