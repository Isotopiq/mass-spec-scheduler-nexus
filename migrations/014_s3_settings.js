export default async function migrate({ pool }) {
  await pool.query(`
    ALTER TABLE app_settings
    ADD COLUMN IF NOT EXISTS s3_provider TEXT NOT NULL DEFAULT 'local',
    ADD COLUMN IF NOT EXISTS s3_endpoint TEXT,
    ADD COLUMN IF NOT EXISTS s3_region TEXT,
    ADD COLUMN IF NOT EXISTS s3_bucket TEXT,
    ADD COLUMN IF NOT EXISTS s3_access_key_id TEXT,
    ADD COLUMN IF NOT EXISTS s3_secret_access_key TEXT,
    ADD COLUMN IF NOT EXISTS s3_force_path_style BOOLEAN NOT NULL DEFAULT false;
  `);

  await pool.query(
    `
    UPDATE app_settings
    SET
      s3_provider = COALESCE(NULLIF($1, ''), s3_provider),
      s3_endpoint = COALESCE(NULLIF($2, ''), s3_endpoint),
      s3_region = COALESCE(NULLIF($3, ''), s3_region),
      s3_bucket = COALESCE(NULLIF($4, ''), s3_bucket),
      s3_access_key_id = COALESCE(NULLIF($5, ''), s3_access_key_id),
      s3_secret_access_key = COALESCE(NULLIF($6, ''), s3_secret_access_key),
      s3_force_path_style = CASE WHEN $7 THEN true ELSE s3_force_path_style END,
      s3_path_prefix = COALESCE(NULLIF($8, ''), s3_path_prefix)
    WHERE s3_provider = 'local' OR s3_endpoint IS NULL;
    `,
    [
      process.env.S3_PROVIDER || '',
      process.env.S3_ENDPOINT || '',
      process.env.S3_REGION || '',
      process.env.S3_BUCKET || '',
      process.env.S3_ACCESS_KEY_ID || '',
      process.env.S3_SECRET_ACCESS_KEY || '',
      process.env.S3_FORCE_PATH_STYLE === 'true',
      process.env.S3_PATH_PREFIX || ''
    ]
  );
}
