function shell({ title, content }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    @media only screen and (max-width: 600px) {
      .email-content { padding: 24px !important; }
      .email-footer { padding: 20px 24px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
      <td align="center" style="padding:20px 0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="background:#ffffff;padding:24px 0;text-align:center;border-bottom:1px solid #e5e7eb;">
              <a href="{{siteUrl}}" target="_blank" style="display:inline-block;">
                <img src="{{logoUrl}}" alt="MSLab Scheduler" style="max-height:64px;max-width:200px;border:0;display:block;margin:0 auto;">
              </a>
            </td>
          </tr>
          <tr>
            <td class="email-content" style="padding:32px 32px 24px;color:#1f2937;font-size:16px;line-height:1.6;">
              ${content}
            </td>
          </tr>
          <tr>
            <td class="email-footer" style="background:#f9fafb;padding:24px 32px;text-align:center;color:#6b7280;font-size:13px;line-height:1.5;border-top:1px solid #e5e7eb;">
              <a href="{{siteUrl}}" style="color:#4f46e5;text-decoration:none;font-weight:500;">MSLab Scheduler</a><br>
              <span style="color:#9ca3af;">This is an automated email. Please do not reply.</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

const modernTemplates = {
  welcome: {
    subject: 'Welcome to MSLab Scheduler, {{userName}}!',
    html: shell({
      title: 'Welcome',
      content: `<h1 style="color:#111827;font-size:24px;margin:0 0 16px;">Welcome, {{userName}}!</h1>
<p style="color:#4b5563;font-size:16px;line-height:1.6;margin:0 0 24px;">Your account has been successfully created. You are ready to start booking laboratory instruments and managing your reservations.</p>
<div style="background:#f0fdf4;border-left:4px solid #10b981;padding:16px;margin:16px 0;border-radius:6px;">
  <p style="margin:0;color:#065f46;font-weight:600;">What you can do now</p>
  <ul style="margin:8px 0 0;padding-left:20px;color:#4b5563;">
    <li>Browse and book instruments</li>
    <li>Track your usage and history</li>
    <li>Manage your profile and notifications</li>
  </ul>
</div>
<p style="text-align:center;margin:24px 0 0;">
  <a href="{{siteUrl}}" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:600;">Start Exploring</a>
</p>`
    })
  },
  booking_confirmation: {
    subject: 'Booking Confirmation: {{instrumentName}}',
    html: shell({
      title: 'Booking Confirmed',
      content: `<h1 style="color:#111827;font-size:24px;margin:0 0 16px;">Booking Confirmed</h1>
<p style="color:#4b5563;font-size:16px;line-height:1.6;margin:0 0 16px;">Dear {{userName}},</p>
<p style="color:#4b5563;font-size:16px;line-height:1.6;margin:0 0 24px;">Your booking has been confirmed. Here are the details:</p>
<div style="background:#f0fdf4;border-left:4px solid #10b981;padding:16px;margin:16px 0;border-radius:6px;">
  <p style="margin:0 0 8px;color:#4b5563;"><strong>Instrument:</strong> {{instrumentName}}</p>
  <p style="margin:0 0 8px;color:#4b5563;"><strong>Start:</strong> {{startDate}}</p>
  <p style="margin:0 0 8px;color:#4b5563;"><strong>End:</strong> {{endDate}}</p>
  <p style="margin:0;color:#4b5563;"><strong>Status:</strong> {{status}}</p>
</div>
<p style="text-align:center;margin:24px 0 0;">
  <a href="{{siteUrl}}/my-bookings" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:600;">View My Bookings</a>
</p>`
    })
  },
  booking_update: {
    subject: 'Booking Status Update: {{instrumentName}}',
    html: shell({
      title: 'Booking Status Update',
      content: `<h1 style="color:#111827;font-size:24px;margin:0 0 16px;">Booking Status Update</h1>
<p style="color:#4b5563;font-size:16px;line-height:1.6;margin:0 0 16px;">Dear {{userName}},</p>
<p style="color:#4b5563;font-size:16px;line-height:1.6;margin:0 0 24px;">Your booking has been updated:</p>
<div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:16px;margin:16px 0;border-radius:6px;">
  <p style="margin:0 0 8px;color:#4b5563;"><strong>Instrument:</strong> {{instrumentName}}</p>
  <p style="margin:0 0 8px;color:#4b5563;"><strong>Start:</strong> {{startDate}}</p>
  <p style="margin:0 0 8px;color:#4b5563;"><strong>End:</strong> {{endDate}}</p>
  <p style="margin:0;color:#4b5563;"><strong>New status:</strong> {{status}}</p>
</div>
<p style="text-align:center;margin:24px 0 0;">
  <a href="{{siteUrl}}/my-bookings" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:600;">View My Bookings</a>
</p>`
    })
  },
  booking_approved: {
    subject: 'Booking Approved: {{instrumentName}}',
    html: shell({
      title: 'Booking Approved',
      content: `<h1 style="color:#111827;font-size:24px;margin:0 0 16px;">Booking Approved</h1>
<p style="color:#4b5563;font-size:16px;line-height:1.6;margin:0 0 16px;">Dear {{userName}},</p>
<p style="color:#4b5563;font-size:16px;line-height:1.6;margin:0 0 24px;">Good news! Your booking for <strong>{{instrumentName}}</strong> has been approved.</p>
<div style="background:#f0fdf4;border-left:4px solid #10b981;padding:16px;margin:16px 0;border-radius:6px;">
  <p style="margin:0 0 8px;color:#4b5563;"><strong>Instrument:</strong> {{instrumentName}}</p>
  <p style="margin:0 0 8px;color:#4b5563;"><strong>Start:</strong> {{startDate}}</p>
  <p style="margin:0 0 8px;color:#4b5563;"><strong>End:</strong> {{endDate}}</p>
  <p style="margin:0;color:#4b5563;"><strong>Status:</strong> confirmed</p>
</div>
<p style="text-align:center;margin:24px 0 0;">
  <a href="{{siteUrl}}/my-bookings" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:600;">View My Bookings</a>
</p>`
    })
  },
  booking_denied: {
    subject: 'Booking Denied: {{instrumentName}}',
    html: shell({
      title: 'Booking Denied',
      content: `<h1 style="color:#111827;font-size:24px;margin:0 0 16px;">Booking Denied</h1>
<p style="color:#4b5563;font-size:16px;line-height:1.6;margin:0 0 16px;">Dear {{userName}},</p>
<p style="color:#4b5563;font-size:16px;line-height:1.6;margin:0 0 24px;">Unfortunately, your booking for <strong>{{instrumentName}}</strong> was denied. Please contact your administrator if you have questions.</p>
<div style="background:#fef2f2;border-left:4px solid #ef4444;padding:16px;margin:16px 0;border-radius:6px;">
  <p style="margin:0 0 8px;color:#4b5563;"><strong>Instrument:</strong> {{instrumentName}}</p>
  <p style="margin:0 0 8px;color:#4b5563;"><strong>Requested start:</strong> {{startDate}}</p>
  <p style="margin:0;color:#4b5563;"><strong>Requested end:</strong> {{endDate}}</p>
</div>
<p style="text-align:center;margin:24px 0 0;">
  <a href="{{siteUrl}}/calendar" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:600;">Book Another Slot</a>
</p>`
    })
  },
  booking_delayed: {
    subject: 'Booking Delayed: {{instrumentName}}',
    html: shell({
      title: 'Booking Delayed',
      content: `<h1 style="color:#111827;font-size:24px;margin:0 0 16px;">Booking Delayed</h1>
<p style="color:#4b5563;font-size:16px;line-height:1.6;margin:0 0 16px;">Dear {{userName}},</p>
<p style="color:#4b5563;font-size:16px;line-height:1.6;margin:0 0 24px;">Your booking for <strong>{{instrumentName}}</strong> has been delayed by <strong>{{delayMinutes}} minutes</strong>.</p>
<div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:16px;margin:16px 0;border-radius:6px;">
  <p style="margin:0 0 8px;color:#4b5563;"><strong>Reason:</strong> {{reason}}</p>
  <p style="margin:0 0 8px;color:#4b5563;"><strong>Previous start:</strong> {{oldStartDate}}</p>
  <p style="margin:0 0 8px;color:#4b5563;"><strong>New start:</strong> {{newStartDate}}</p>
  <p style="margin:0;color:#4b5563;"><strong>New end:</strong> {{newEndDate}}</p>
</div>
<p style="text-align:center;margin:24px 0 0;">
  <a href="{{siteUrl}}/my-bookings" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:600;">View My Bookings</a>
</p>`
    })
  },
  booking_delay_reversed: {
    subject: 'Booking Delay Reversed: {{instrumentName}}',
    html: shell({
      title: 'Booking Delay Reversed',
      content: `<h1 style="color:#111827;font-size:24px;margin:0 0 16px;">Booking Delay Reversed</h1>
<p style="color:#4b5563;font-size:16px;line-height:1.6;margin:0 0 16px;">Dear {{userName}},</p>
<p style="color:#4b5563;font-size:16px;line-height:1.6;margin:0 0 24px;">The <strong>{{delayMinutes}} minute</strong> delay for <strong>{{instrumentName}}</strong> has been reversed. Your booking is back to its original schedule.</p>
<div style="background:#ecfdf5;border-left:4px solid #10b981;padding:16px;margin:16px 0;border-radius:6px;">
  <p style="margin:0 0 8px;color:#4b5563;"><strong>Instrument:</strong> {{instrumentName}}</p>
  <p style="margin:0 0 8px;color:#4b5563;"><strong>Delayed start:</strong> {{oldStartDate}}</p>
  <p style="margin:0 0 8px;color:#4b5563;"><strong>Restored start:</strong> {{newStartDate}}</p>
  <p style="margin:0;color:#4b5563;"><strong>Restored end:</strong> {{newEndDate}}</p>
</div>
<p style="text-align:center;margin:24px 0 0;">
  <a href="{{siteUrl}}/my-bookings" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:600;">View My Bookings</a>
</p>`
    })
  },
  comment_notification: {
    subject: 'New Comment on Your Booking: {{instrumentName}}',
    html: shell({
      title: 'New Comment Added',
      content: `<h1 style="color:#111827;font-size:24px;margin:0 0 16px;">New Comment on Your Booking</h1>
<p style="color:#4b5563;font-size:16px;line-height:1.6;margin:0 0 16px;">Dear {{userName}},</p>
<p style="color:#4b5563;font-size:16px;line-height:1.6;margin:0 0 24px;">A new comment has been added to your <strong>{{instrumentName}}</strong> booking by <strong>{{commentBy}}</strong>.</p>
<div style="background:#f3f4f6;border-left:4px solid #7c3aed;padding:16px;margin:16px 0;border-radius:6px;">
  <p style="margin:0 0 8px;color:#4b5563;"><strong>Booking date:</strong> {{bookingDate}}</p>
  <p style="margin:0 0 8px;color:#4b5563;"><strong>Time:</strong> {{commentTime}}</p>
  <p style="margin:0;color:#4b5563;"><strong>Comment:</strong> {{commentContent}}</p>
</div>
<p style="text-align:center;margin:24px 0 0;">
  <a href="{{siteUrl}}/my-bookings" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:600;">View My Bookings</a>
</p>`
    })
  },
  waitlist_filled: {
    subject: 'Waitlist Slot Auto-Booked: {{instrumentName}}',
    html: shell({
      title: 'Waitlist Slot Auto-Booked',
      content: `<h1 style="color:#111827;font-size:24px;margin:0 0 16px;">Waitlist Slot Auto-Booked</h1>
<p style="color:#4b5563;font-size:16px;line-height:1.6;margin:0 0 16px;">Great news!</p>
<p style="color:#4b5563;font-size:16px;line-height:1.6;margin:0 0 24px;">A <strong>{{instrumentName}}</strong> slot became available and has been automatically booked for you.</p>
<div style="background:#f0fdf4;border-left:4px solid #10b981;padding:16px;margin:16px 0;border-radius:6px;">
  <p style="margin:0 0 8px;color:#4b5563;"><strong>Instrument:</strong> {{instrumentName}}</p>
  <p style="margin:0 0 8px;color:#4b5563;"><strong>Date:</strong> {{bookingDate}}</p>
  <p style="margin:0;color:#4b5563;"><strong>Status:</strong> confirmed</p>
</div>
<p style="text-align:center;margin:24px 0 0;">
  <a href="{{siteUrl}}/my-bookings" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:600;">View My Bookings</a>
</p>`
    })
  },
  swap_status: {
    subject: 'Swap Request {{status}}',
    html: shell({
      title: 'Swap Request Update',
      content: `<h1 style="color:#111827;font-size:24px;margin:0 0 16px;">Swap Request {{status}}</h1>
<p style="color:#4b5563;font-size:16px;line-height:1.6;margin:0 0 16px;">Hello,</p>
<p style="color:#4b5563;font-size:16px;line-height:1.6;margin:0 0 24px;">Your swap request between <strong>{{requesterName}}</strong> and <strong>{{recipientName}}</strong> has been marked as <strong>{{status}}</strong>.</p>
<div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:16px;margin:16px 0;border-radius:6px;">
  <p style="margin:0 0 8px;color:#4b5563;"><strong>Requester:</strong> {{requesterName}}</p>
  <p style="margin:0;color:#4b5563;"><strong>Recipient:</strong> {{recipientName}}</p>
</div>
<p style="text-align:center;margin:24px 0 0;">
  <a href="{{siteUrl}}/my-bookings" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:600;">View My Bookings</a>
</p>`
    })
  },
  notification_digest: {
    subject: 'Your MSLab Scheduler Digest',
    html: shell({
      title: 'Notification Digest',
      content: `<h1 style="color:#111827;font-size:24px;margin:0 0 16px;">Hello {{userName}},</h1>
<p style="color:#4b5563;font-size:16px;line-height:1.6;margin:0 0 24px;">Here are your recent notifications from MSLab Scheduler:</p>
<ul style="margin:0 0 24px;padding-left:20px;">
  {{notifications}}
</ul>
<p style="text-align:center;margin:24px 0 0;">
  <a href="{{siteUrl}}" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:600;">View Dashboard</a>
</p>`
    })
  },
  password_reset: {
    subject: 'Reset Your MSLab Scheduler Password',
    html: shell({
      title: 'Password Reset',
      content: `<h1 style="color:#111827;font-size:24px;margin:0 0 16px;">Reset Your Password</h1>
<p style="color:#4b5563;font-size:16px;line-height:1.6;margin:0 0 24px;">Click the button below to reset your password. The link expires in 1 hour.</p>
<p style="text-align:center;margin:24px 0;">
  <a href="{{resetUrl}}" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:600;">Reset Password</a>
</p>
<p style="color:#4b5563;font-size:14px;line-height:1.5;">If the button does not work, paste this link into your browser:<br><a href="{{resetUrl}}" style="color:#4f46e5;word-break:break-all;">{{resetUrl}}</a></p>`
    })
  },
  smtp_test: {
    subject: 'SMTP Test - MSLab Scheduler',
    html: shell({
      title: 'SMTP Test',
      content: `<h1 style="color:#111827;font-size:24px;margin:0 0 16px;">SMTP Test Email</h1>
<p style="color:#4b5563;font-size:16px;line-height:1.6;margin:0 0 16px;">This is a test email from <strong>MSLab Scheduler</strong>.</p>
<p style="color:#4b5563;font-size:16px;line-height:1.6;margin:0 0 24px;">If you received this email, your SMTP settings are configured correctly.</p>
<div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:16px;margin:16px 0;border-radius:6px;">
  <p style="margin:0;color:#4b5563;"><strong>Sent at:</strong> {{sentAt}}</p>
</div>`
    })
  }
};

const OLD_HEADER_PREFIX = '<!DOCTYPE html><html><body><div style="text-align:center"><img src="{{logoUrl}}"';

export { modernTemplates, OLD_HEADER_PREFIX };

export default async function migrate({ pool }) {
  // Update any email template that still uses the legacy single-line logo header
  // (the default from 001_init.sql or 007_notifications.sql) to the modern design.
  for (const [type, tpl] of Object.entries(modernTemplates)) {
    await pool.query(
      'UPDATE email_templates SET subject = $2, html_content = $3 WHERE template_type = $1 AND html_content LIKE $4',
      [type, tpl.subject, tpl.html, `${OLD_HEADER_PREFIX}%`]
    );
  }

  // Insert any missing templates (new types or if a default was deleted).
  for (const [type, tpl] of Object.entries(modernTemplates)) {
    await pool.query(
      'INSERT INTO email_templates (template_type, subject, html_content) VALUES ($1, $2, $3) ON CONFLICT (template_type) DO NOTHING',
      [type, tpl.subject, tpl.html]
    );
  }
}
