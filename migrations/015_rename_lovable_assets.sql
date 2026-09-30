UPDATE app_settings
SET
  logo_url = REPLACE(logo_url, '/lovable-uploads/', '/site-assets/'),
  favicon_url = REPLACE(favicon_url, '/lovable-uploads/', '/site-assets/')
WHERE logo_url LIKE '%/lovable-uploads/%' OR favicon_url LIKE '%/lovable-uploads/%';

UPDATE profiles
SET profile_image = REPLACE(profile_image, '/lovable-uploads/', '/site-assets/')
WHERE profile_image LIKE '%/lovable-uploads/%';

UPDATE instruments
SET image = REPLACE(image, '/lovable-uploads/', '/site-assets/')
WHERE image LIKE '%/lovable-uploads/%';
