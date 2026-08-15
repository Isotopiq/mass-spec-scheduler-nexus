// Shared email template presets used by migrations and the server.
// Keep this file environment-agnostic (no Node/browser-only globals).

function cardShell({ title, content }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
  <title>{{title}}</title>
  <style>
    html, body { margin:0 !important; padding:0 !important; width:100% !important; background:#f4f7fa; }
    table { border-collapse: collapse !important; }
    img { border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }
    a { text-decoration:none; }
    @media only screen and (max-width: 640px) {
      .outer-pad { padding: 16px 8px !important; }
      .email-shell { width: 100% !important; max-width: 100% !important; }
      .email-card { border-radius: 16px !important; }
      .pad-x { padding-left: 22px !important; padding-right: 22px !important; }
      .hero { padding-top: 28px !important; padding-bottom: 26px !important; }
      .logo { width: 245px !important; max-width: 100% !important; }
      .hero-title { font-size: 30px !important; line-height: 36px !important; }
      .stack { display: block !important; width: 100% !important; }
      .stack-gap { padding-top: 14px !important; }
      .detail-label { width: 100% !important; display: block !important; padding-bottom: 3px !important; }
      .detail-value { width: 100% !important; display: block !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background:#f4f7fa; font-family:Arial, Helvetica, sans-serif; color:#172033;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">
    {{previewText}}
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; background:#f4f7fa;">
    <tr>
      <td class="outer-pad" align="center" style="padding:36px 14px;">
        <table role="presentation" class="email-shell" width="620" cellspacing="0" cellpadding="0" border="0" style="width:620px; max-width:620px;">
          <tr>
            <td class="email-card" style="background:#ffffff; border-radius:20px; overflow:hidden; box-shadow:0 10px 28px rgba(15, 23, 42, 0.08); border:1px solid #e7edf3;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr><td style="height:6px; line-height:6px; font-size:0; background:#2774AE;">&nbsp;</td></tr>
              </table>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td class="pad-x" align="center" style="padding:26px 36px 18px;">
                    <img class="logo" src="{{logoUrl}}" alt="{{siteName}}" width="290" style="display:block; width:290px; max-width:100%; height:auto;">
                  </td>
                </tr>
              </table>
              ${content}
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td class="pad-x" align="center" style="padding:24px 42px 28px; border-top:1px solid #EDF1F5; background:#FBFCFD; text-align:center;">
                    <div style="font-size:13px; line-height:20px; font-weight:700; color:#0B2343; text-align:center;">{{footerSiteName}}</div>
                    <div style="padding-top:4px; font-size:12px; line-height:19px; color:#7A8699; text-align:center;">{{footerTagline}}</div>
                    <div style="padding-top:13px; font-size:11px; line-height:17px; color:#98A2B3; text-align:center;">This is an automated booking notification.</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:16px 12px 0; font-size:11px; line-height:17px; color:#98A2B3;">
              &copy; {{footerSiteName}}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function detailRow(label, value) {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
  <tr><td style="padding-top:18px;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
      <tr>
        <td class="detail-label" width="128" valign="top" style="width:128px; font-size:13px; line-height:21px; color:#7A8699; font-weight:700;">${label}</td>
        <td class="detail-value" valign="top" style="font-size:15px; line-height:22px; color:#101828; font-weight:700;">${value}</td>
      </tr>
    </table>
  </td></tr>
</table>`;
}

function cardHero({ label, title, description }) {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
  <tr><td class="pad-x hero" style="padding:18px 42px 30px;">
    <div style="font-size:12px; line-height:18px; letter-spacing:1.4px; text-transform:uppercase; font-weight:700; color:#2774AE;">${label}</div>
    <div class="hero-title" style="padding-top:7px; font-size:36px; line-height:43px; font-weight:800; letter-spacing:-0.7px; color:#0B2343;">${title}</div>
    <div style="padding-top:11px; max-width:500px; font-size:16px; line-height:26px; color:#667085;">${description}</div>
  </td></tr>
</table>`;
}

function cardGreeting() {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
  <tr><td class="pad-x" style="padding:0 42px 20px;">
    <div style="font-size:16px; line-height:26px; color:#344054;">Hi <strong style="color:#101828;">{{userName}}</strong>,</div>
  </td></tr>
</table>`;
}

function cardDetailCard({ title, badgeHtml = '', rowsHtml }) {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
  <tr><td class="pad-x" style="padding:0 42px 12px;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#F8FAFC; border:1px solid #E4EAF0; border-radius:16px;">
      <tr><td style="padding:24px 24px 22px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td class="stack" valign="middle">
              <div style="font-size:13px; line-height:18px; font-weight:800; letter-spacing:.9px; text-transform:uppercase; color:#475467;">${title}</div>
            </td>
            <td class="stack stack-gap" align="right" valign="middle">
              ${badgeHtml}
            </td>
          </tr>
        </table>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td style="padding:18px 0 0;"><div style="height:1px; line-height:1px; font-size:0; background:#E5EAF0;">&nbsp;</div></td></tr></table>
        ${rowsHtml}
      </td></tr>
    </table>
  </td></tr>
</table>`;
}

function cardCta({ url, text }) {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
  <tr><td class="pad-x" style="padding:14px 42px 32px;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
      <tr><td style="background:#2774AE; border-radius:10px;">
        <a href="${url}" target="_blank" style="display:inline-block; padding:13px 20px; font-size:14px; line-height:18px; font-weight:700; color:#ffffff; border-radius:10px;">${text}</a>
      </td></tr>
    </table>
  </td></tr>
</table>`;
}

function cardNote(text) {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
  <tr><td class="pad-x" style="padding:0 42px 34px;">
    <div style="padding:16px 18px; background:#FFF9E8; border-radius:12px; border:1px solid #F6E8B2; font-size:13px; line-height:21px; color:#725A15;">${text}</div>
  </td></tr>
</table>`;
}

function statusBadge(statusVar, color) {
  return `<span style="display:inline-block; padding:6px 12px; border-radius:9999px; background:${color.bg}; color:${color.text}; font-size:12px; line-height:16px; font-weight:700; text-transform:capitalize;">${statusVar}</span>`;
}

const COLORS = {
  green: { bg: '#ECFDF5', text: '#047857' },
  red: { bg: '#FEF2F2', text: '#B91C1C' },
  yellow: { bg: '#FFFBEB', text: '#B45309' },
  blue: { bg: '#EFF6FF', text: '#1D4ED8' }
};

function cardContent({ label, title, description, greeting = true, detailTitle, badge, rowsHtml, ctaUrl, ctaText, note }) {
  let html = cardHero({ label, title, description });
  if (greeting) html += cardGreeting();
  if (detailTitle || rowsHtml) {
    html += cardDetailCard({ title: detailTitle || 'Reservation details', badgeHtml: badge, rowsHtml });
  }
  if (ctaUrl && ctaText) html += cardCta({ url: ctaUrl, text: ctaText });
  if (note) html += cardNote(note);
  return html;
}

function welcomeContent() {
  return cardHero({ label: 'Welcome', title: 'Welcome to MSLab Scheduler', description: 'Your account has been created and you are ready to start managing lab instruments and bookings.' })
    + cardGreeting()
    + cardNote('You can book instruments, track usage, request swaps, and receive schedule updates from this platform.')
    + cardCta({ url: '{{siteUrl}}', text: 'Start Exploring' });
}

function accountCreatedContent() {
  return cardHero({ label: 'Account created', title: 'Your account has been created', description: 'An administrator has created an account for you on MSLab Scheduler.' })
    + cardGreeting()
    + cardDetailCard({ title: 'Login details', rowsHtml: detailRow('Email', '{{userEmail}}') + detailRow('Temporary password', '{{temporaryPassword}}') })
    + cardNote('Please sign in and change your temporary password from your profile page.')
    + cardCta({ url: '{{siteUrl}}/login', text: 'Sign In' });
}

function bookingConfirmationContent() {
  return cardContent({
    label: 'Booking confirmation',
    title: 'Your booking is confirmed',
    description: 'We have reserved the instrument and time slot listed below.',
    detailTitle: 'Reservation details',
    badge: statusBadge('{{status}}', COLORS.green),
    rowsHtml: detailRow('Instrument', '{{instrumentName}}')
      + detailRow('Start', '{{startDate}}')
      + detailRow('End', '{{endDate}}'),
    ctaUrl: '{{siteUrl}}/my-bookings',
    ctaText: 'View My Bookings',
    note: 'If you need to make changes, please contact the lab administrator before your scheduled time.'
  });
}

function bookingUpdateContent() {
  return cardContent({
    label: 'Booking notification',
    title: 'Your booking was updated',
    description: 'The reservation details below reflect the latest changes made in MSLab Scheduler.',
    detailTitle: 'Updated reservation details',
    badge: statusBadge('{{status}}', COLORS.green),
    rowsHtml: detailRow('Instrument', '{{instrumentName}}')
      + detailRow('Start', '{{startDate}}')
      + detailRow('End', '{{endDate}}')
      + detailRow('New Status', '{{status}}'),
    ctaUrl: '{{siteUrl}}/my-bookings',
    ctaText: 'View My Bookings',
    note: 'If something looks incorrect, please contact the team before your scheduled reservation.'
  });
}

function bookingApprovedContent() {
  return cardContent({
    label: 'Booking approved',
    title: 'Your booking was approved',
    description: 'An administrator has confirmed your reservation.',
    detailTitle: 'Reservation details',
    badge: statusBadge('{{status}}', COLORS.green),
    rowsHtml: detailRow('Instrument', '{{instrumentName}}')
      + detailRow('Start', '{{startDate}}')
      + detailRow('End', '{{endDate}}')
      + detailRow('Status', '{{status}}'),
    ctaUrl: '{{siteUrl}}/my-bookings',
    ctaText: 'View My Bookings',
    note: 'Please arrive on time. Contact the lab if you cannot make your slot.'
  });
}

function bookingDeniedContent() {
  return cardContent({
    label: 'Booking denied',
    title: 'Your booking was denied',
    description: 'An administrator could not approve this reservation.',
    detailTitle: 'Requested reservation',
    badge: statusBadge('{{status}}', COLORS.red),
    rowsHtml: detailRow('Instrument', '{{instrumentName}}')
      + detailRow('Requested start', '{{startDate}}')
      + detailRow('Requested end', '{{endDate}}')
      + detailRow('Status', '{{status}}'),
    ctaUrl: '{{siteUrl}}/calendar',
    ctaText: 'Book Another Slot',
    note: 'Please contact your administrator if you have questions.'
  });
}

function bookingDelayedContent() {
  return cardContent({
    label: 'Schedule update',
    title: 'Your booking has been delayed',
    description: 'A schedule delay has pushed your reservation to a new time.',
    detailTitle: 'Delay details',
    badge: statusBadge('delayed', COLORS.yellow),
    rowsHtml: detailRow('Instrument', '{{instrumentName}}')
      + detailRow('Reason', '{{reason}}')
      + detailRow('Previous start', '{{oldStartDate}}')
      + detailRow('New start', '{{newStartDate}}')
      + detailRow('New end', '{{newEndDate}}'),
    ctaUrl: '{{siteUrl}}/my-bookings',
    ctaText: 'View My Bookings',
    note: 'We apologize for the inconvenience. Please update your schedule accordingly.'
  });
}

function bookingDelayReversedContent() {
  return cardContent({
    label: 'Schedule update',
    title: 'Your booking delay was reversed',
    description: 'The schedule delay for your reservation has been reversed and your original times have been restored.',
    detailTitle: 'Restored reservation',
    badge: statusBadge('restored', COLORS.green),
    rowsHtml: detailRow('Instrument', '{{instrumentName}}')
      + detailRow('Delayed start', '{{oldStartDate}}')
      + detailRow('Restored start', '{{newStartDate}}')
      + detailRow('Restored end', '{{newEndDate}}'),
    ctaUrl: '{{siteUrl}}/my-bookings',
    ctaText: 'View My Bookings',
    note: 'Your booking is back to its originally scheduled time.'
  });
}

function commentNotificationContent() {
  return cardContent({
    label: 'Booking comment',
    title: 'New comment on your booking',
    description: 'Someone left a comment on one of your reservations.',
    detailTitle: 'Comment details',
    rowsHtml: detailRow('Instrument', '{{instrumentName}}')
      + detailRow('Booking date', '{{bookingDate}}')
      + detailRow('Comment by', '{{commentBy}}')
      + detailRow('Comment', '{{commentContent}}')
      + detailRow('Time', '{{commentTime}}'),
    ctaUrl: '{{siteUrl}}/my-bookings',
    ctaText: 'View My Bookings',
    note: 'You can reply by adding another comment to the booking.'
  });
}

function waitlistFilledContent() {
  return cardContent({
    label: 'Waitlist update',
    title: 'A slot you were waiting for is now booked',
    description: 'A cancellation created an opening and it has been automatically assigned to you.',
    detailTitle: 'Reservation details',
    badge: statusBadge('{{status}}', COLORS.green),
    rowsHtml: detailRow('Instrument', '{{instrumentName}}')
      + detailRow('Date', '{{startDate}}')
      + detailRow('End', '{{endDate}}')
      + detailRow('Status', '{{status}}'),
    ctaUrl: '{{siteUrl}}/my-bookings',
    ctaText: 'View My Bookings',
    note: 'Please review the booking details and arrive on time.'
  });
}

function swapStatusContent() {
  return cardContent({
    label: 'Swap update',
    title: 'Swap request {{status}}',
    description: 'A booking swap request you are involved in has been updated.',
    detailTitle: 'Swap details',
    badge: statusBadge('{{status}}', COLORS.blue),
    rowsHtml: detailRow('Requester', '{{requesterName}}')
      + detailRow('Recipient', '{{recipientName}}'),
    ctaUrl: '{{siteUrl}}/my-bookings',
    ctaText: 'View My Bookings',
    note: 'Contact the other user or an administrator if you have questions about this swap.'
  });
}

function notificationDigestContent() {
  return cardHero({ label: 'Digest', title: 'Your recent notifications', description: 'Here is a summary of activity from MSLab Scheduler since your last digest.' })
    + cardGreeting()
    + cardDetailCard({ title: 'Recent notifications', rowsHtml: '<div style="font-size:15px; line-height:22px; color:#101828;">{{notifications}}</div>' })
    + cardCta({ url: '{{siteUrl}}', text: 'View Dashboard' });
}

function passwordResetContent() {
  return cardHero({ label: 'Security', title: 'Reset your password', description: 'We received a request to reset your password. Use the button below to choose a new one.' })
    + cardGreeting()
    + cardCta({ url: '{{resetUrl}}', text: 'Reset Password' })
    + cardNote('This link expires in 1 hour. If you did not request a reset, you can safely ignore this email.');
}

function smtpTestContent() {
  return cardHero({ label: 'System test', title: 'SMTP Test Email', description: 'This is a test message to confirm your SMTP settings are configured correctly.' })
    + cardDetailCard({ title: 'Test details', rowsHtml: detailRow('Sent at', '{{sentAt}}') + detailRow('Site', '{{siteUrl}}') })
    + cardNote('If you received this email, your email configuration is working.');
}

export const cardTemplates = {
  welcome: { subject: 'Welcome to MSLab Scheduler, {{userName}}!', html: cardShell({ title: 'Welcome', content: welcomeContent() }) },
  account_created: { subject: 'Your MSLab Scheduler account has been created', html: cardShell({ title: 'Account Created', content: accountCreatedContent() }) },
  booking_confirmation: { subject: 'Booking Confirmation: {{instrumentName}}', html: cardShell({ title: 'Booking Confirmation', content: bookingConfirmationContent() }) },
  booking_update: { subject: 'Booking Update: {{instrumentName}}', html: cardShell({ title: 'Booking Update', content: bookingUpdateContent() }) },
  booking_approved: { subject: 'Booking Approved: {{instrumentName}}', html: cardShell({ title: 'Booking Approved', content: bookingApprovedContent() }) },
  booking_denied: { subject: 'Booking Denied: {{instrumentName}}', html: cardShell({ title: 'Booking Denied', content: bookingDeniedContent() }) },
  booking_delayed: { subject: 'Booking Delayed: {{instrumentName}}', html: cardShell({ title: 'Booking Delayed', content: bookingDelayedContent() }) },
  booking_delay_reversed: { subject: 'Booking Delay Reversed: {{instrumentName}}', html: cardShell({ title: 'Booking Delay Reversed', content: bookingDelayReversedContent() }) },
  comment_notification: { subject: 'New Comment on Your Booking: {{instrumentName}}', html: cardShell({ title: 'New Comment on Your Booking', content: commentNotificationContent() }) },
  waitlist_filled: { subject: 'Waitlist Slot Auto-Booked: {{instrumentName}}', html: cardShell({ title: 'Waitlist Slot Auto-Booked', content: waitlistFilledContent() }) },
  swap_status: { subject: 'Swap Request {{status}}', html: cardShell({ title: 'Swap Request Update', content: swapStatusContent() }) },
  notification_digest: { subject: 'Your MSLab Scheduler Digest', html: cardShell({ title: 'Notification Digest', content: notificationDigestContent() }) },
  password_reset: { subject: 'Password Reset', html: cardShell({ title: 'Password Reset', content: passwordResetContent() }) },
  smtp_test: { subject: 'SMTP Test Email', html: cardShell({ title: 'SMTP Test', content: smtpTestContent() }) }
};

// Re-export the existing modern templates from the migration file so the server can apply either style.
export { modernTemplates } from './migrations/009_email_templates.js';
