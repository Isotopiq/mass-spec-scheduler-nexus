ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS site_name TEXT;

UPDATE app_settings
SET site_name = 'TeSlaa Lab MS Scheduling Suite'
WHERE id = '00000000-0000-0000-0000-000000000001'
  AND site_name IS NULL;
