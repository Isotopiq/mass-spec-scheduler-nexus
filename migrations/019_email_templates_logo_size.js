import { cardTemplates } from '../emailTemplatePresets.js';

export default async function migrate({ pool }) {
  // Re-apply the card-style templates with the smaller, aspect-ratio-preserving logo.
  for (const [type, tpl] of Object.entries(cardTemplates)) {
    await pool.query(
      `UPDATE email_templates
       SET html_content = $2, updated_at = now()
       WHERE template_type = $1`,
      [type, tpl.html]
    );
  }
}
