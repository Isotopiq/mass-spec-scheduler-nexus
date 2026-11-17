import { modernTemplates, OLD_HEADER_PREFIX } from './009_email_templates.js';

export default async function migrate({ pool }) {
  // Ensure legacy single-line logo-header templates are upgraded to the modern design.
  // This catches templates seeded by earlier migrations (e.g. 007_notifications.sql)
  // before 009 was corrected.
  for (const [type, tpl] of Object.entries(modernTemplates)) {
    await pool.query(
      'UPDATE email_templates SET subject = $2, html_content = $3 WHERE template_type = $1 AND html_content LIKE $4',
      [type, tpl.subject, tpl.html, `${OLD_HEADER_PREFIX}%`]
    );
  }

  // Insert any missing templates.
  for (const [type, tpl] of Object.entries(modernTemplates)) {
    await pool.query(
      'INSERT INTO email_templates (template_type, subject, html_content) VALUES ($1, $2, $3) ON CONFLICT (template_type) DO NOTHING',
      [type, tpl.subject, tpl.html]
    );
  }
}
