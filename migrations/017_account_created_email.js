import { cardTemplates } from '../emailTemplatePresets.js';

export default async function migrate({ pool }) {
  const tpl = cardTemplates.account_created;
  if (!tpl) return;

  await pool.query(
    `UPDATE email_templates
     SET subject = $2, html_content = $3, updated_at = now()
     WHERE template_type = $1`,
    ['account_created', tpl.subject, tpl.html]
  );

  await pool.query(
    `INSERT INTO email_templates (template_type, subject, html_content)
     VALUES ($1, $2, $3)
     ON CONFLICT (template_type) DO NOTHING`,
    ['account_created', tpl.subject, tpl.html]
  );
}
