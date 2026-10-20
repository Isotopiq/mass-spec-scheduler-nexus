import { cardTemplates } from '../emailTemplatePresets.js';

export default async function migrate({ pool }) {
  // Apply the new card-style default templates globally.
  for (const [type, tpl] of Object.entries(cardTemplates)) {
    await pool.query(
      `UPDATE email_templates
       SET subject = $2, html_content = $3, updated_at = now()
       WHERE template_type = $1`,
      [type, tpl.subject, tpl.html]
    );
  }

  // Insert any missing types.
  for (const [type, tpl] of Object.entries(cardTemplates)) {
    await pool.query(
      `INSERT INTO email_templates (template_type, subject, html_content)
       VALUES ($1, $2, $3)
       ON CONFLICT (template_type) DO NOTHING`,
      [type, tpl.subject, tpl.html]
    );
  }

  // Default new installs to the card style.
  await pool.query(
    `UPDATE app_settings SET email_template_style = 'card' WHERE id = '00000000-0000-0000-0000-000000000001'`
  );
}
