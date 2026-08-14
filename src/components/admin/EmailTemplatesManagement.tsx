import React, { useEffect, useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Mail, Eye, Save, Palette } from "lucide-react";
import { useEmailTemplates } from "../../hooks/useEmailTemplates";
import { useAppSettings } from "../../hooks/useAppSettings";
import { toast } from "sonner";

const EmailTemplatesManagement: React.FC = () => {
  const { emailTemplates, isLoading, loadEmailTemplates, saveEmailTemplate } = useEmailTemplates();
  const { settings } = useAppSettings();
  const [activeTemplate, setActiveTemplate] = useState("booking_confirmation");
  const [formData, setFormData] = useState({
    subject: "",
    htmlContent: ""
  });
  const [testEmail, setTestEmail] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [emailStyle, setEmailStyle] = useState(settings?.email_template_style || "card");
  const [isApplyingStyle, setIsApplyingStyle] = useState(false);

  useEffect(() => {
    loadEmailTemplates();
  }, [loadEmailTemplates]);

  useEffect(() => {
    if (settings?.email_template_style) {
      setEmailStyle(settings.email_template_style);
    }
  }, [settings?.email_template_style]);

  useEffect(() => {
    const template = emailTemplates.find(t => t.templateType === activeTemplate);
    if (template) {
      const newFormData = {
        subject: template.subject,
        htmlContent: template.htmlContent
      };
      setFormData(newFormData);
      setHasChanges(false);
    } else {
      // Set default HTML templates if none exist
      if (activeTemplate === "welcome") {
        setFormData({
          subject: "Welcome to Lab Management System, {{userName}}!",
          htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Welcome</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background-color: white; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 300; }
    .content { padding: 40px 30px; }
    .welcome-box { background-color: #f8fafc; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #667eea; }
    .feature-list { background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .feature-item { display: flex; align-items: center; margin: 10px 0; }
    .feature-icon { color: #667eea; margin-right: 10px; font-weight: bold; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; margin: 20px 0; font-weight: bold; }
    .footer { background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔬 Welcome to Lab Management</h1>
    </div>
    <div class="content">
      <div class="welcome-box">
        <h2 style="margin-top: 0; color: #333;">Hello {{userName}}!</h2>
        <p>We're excited to have you join our lab management community. Your account has been successfully created and you're ready to start managing your laboratory instruments and bookings.</p>
      </div>
      
      <h3 style="color: #333;">What you can do now:</h3>
      <div class="feature-list">
        <div class="feature-item">
          <span class="feature-icon">📅</span>
          <span>Book instruments and manage your reservations</span>
        </div>
        <div class="feature-item">
          <span class="feature-icon">🔍</span>
          <span>Browse available laboratory instruments</span>
        </div>
        <div class="feature-item">
          <span class="feature-icon">📊</span>
          <span>Track your usage and booking history</span>
        </div>
        <div class="feature-item">
          <span class="feature-icon">💬</span>
          <span>Collaborate with team members through comments</span>
        </div>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="#" class="cta-button">Start Exploring →</a>
      </div>
      
      <p style="color: #666; font-size: 14px;">
        <strong>Need help?</strong> Our support team is here to assist you. Feel free to reach out if you have any questions about using the platform.
      </p>
    </div>
    <div class="footer">
      <p><strong>Lab Management System</strong></p>
      <p>Your trusted partner in laboratory efficiency</p>
    </div>
  </div>
</body>
</html>`
        });
      } else if (activeTemplate === "booking_confirmation") {
        setFormData({
          subject: "Booking Confirmation: {{instrumentName}}",
          htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Booking Confirmation</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background-color: #4f46e5; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .booking-details { background-color: #f8fafc; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .footer { background-color: #e5e7eb; padding: 15px; text-align: center; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Booking Confirmation</h1>
  </div>
  <div class="content">
    <p>Dear {{userName}},</p>
    <p>Your booking has been confirmed:</p>
    <div class="booking-details">
      <h3>Booking Details</h3>
      <ul>
        <li><strong>Instrument:</strong> {{instrumentName}}</li>
        <li><strong>Start Date:</strong> {{startDate}}</li>
        <li><strong>End Date:</strong> {{endDate}}</li>
        <li><strong>Status:</strong> {{status}}</li>
      </ul>
    </div>
    <p>Thank you for using the Lab Management System.</p>
  </div>
  <div class="footer">
    <p>Lab Management System | Automated Email</p>
  </div>
</body>
</html>`
        });
      } else if (activeTemplate === "booking_update") {
        setFormData({
          subject: "Booking Update: {{instrumentName}}",
          htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Booking Update</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background-color: #059669; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .booking-details { background-color: #f0fdf4; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .footer { background-color: #e5e7eb; padding: 15px; text-align: center; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Booking Update</h1>
  </div>
  <div class="content">
    <p>Dear {{userName}},</p>
    <p>Your booking has been updated:</p>
    <div class="booking-details">
      <h3>Updated Booking Details</h3>
      <ul>
        <li><strong>Instrument:</strong> {{instrumentName}}</li>
        <li><strong>Start Date:</strong> {{startDate}}</li>
        <li><strong>End Date:</strong> {{endDate}}</li>
        <li><strong>New Status:</strong> {{status}}</li>
      </ul>
    </div>
    <p>Thank you for using the Lab Management System.</p>
  </div>
  <div class="footer">
    <p>Lab Management System | Automated Email</p>
  </div>
</body>
</html>`
        });
      } else if (activeTemplate === "comment_notification") {
        setFormData({
          subject: "New Comment on Your Booking: {{instrumentName}}",
          htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Comment Added</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background-color: #7c3aed; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .booking-details { background-color: #faf5ff; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .comment-box { background-color: #f3f4f6; padding: 15px; border-left: 4px solid #7c3aed; margin: 15px 0; }
    .footer { background-color: #e5e7eb; padding: 15px; text-align: center; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>New Comment Added</h1>
  </div>
  <div class="content">
    <p>Dear {{userName}},</p>
    <p>A new comment has been added to your booking:</p>
    <div class="booking-details">
      <h3>Booking Details</h3>
      <ul>
        <li><strong>Instrument:</strong> {{instrumentName}}</li>
        <li><strong>Start Date:</strong> {{startDate}}</li>
        <li><strong>End Date:</strong> {{endDate}}</li>
      </ul>
    </div>
    <div class="comment-box">
      <h4>New Comment by {{commentAuthor}}</h4>
      <p><strong>Time:</strong> {{commentTime}}</p>
      <p><strong>Comment:</strong> {{commentContent}}</p>
    </div>
    <p>Thank you for using the Lab Management System.</p>
  </div>
  <div class="footer">
    <p>Lab Management System | Automated Email</p>
  </div>
</body>
</html>`
        });
      } else if (activeTemplate === "booking_delayed") {
        setFormData({
          subject: "Booking Delayed: {{instrumentName}}",
          htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Booking Delayed</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background-color: #d97706; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .booking-details { background-color: #fffbeb; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .reason-box { background-color: #f3f4f6; padding: 15px; border-left: 4px solid #d97706; margin: 15px 0; }
    .footer { background-color: #e5e7eb; padding: 15px; text-align: center; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Your Booking Has Been Delayed</h1>
  </div>
  <div class="content">
    <p>Dear {{userName}},</p>
    <p>Your booking has been pushed back by <strong>{{delayMinutes}} minutes</strong>.</p>
    <div class="booking-details">
      <h3>Updated Schedule</h3>
      <ul>
        <li><strong>Instrument:</strong> {{instrumentName}}</li>
        <li><strong>Previous start:</strong> {{oldStartDate}}</li>
        <li><strong>New start:</strong> {{newStartDate}}</li>
        <li><strong>New end:</strong> {{newEndDate}}</li>
      </ul>
    </div>
    <div class="reason-box">
      <h4>Reason for the delay</h4>
      <p>{{reason}}</p>
    </div>
    <p>Please adjust your schedule accordingly. Thank you for your understanding.</p>
  </div>
  <div class="footer">
    <p>Lab Management System | Automated Email</p>
  </div>
</body>
</html>`
        });
      } else if (activeTemplate === "booking_delay_reversed") {
        setFormData({
          subject: "Booking Delay Reversed: {{instrumentName}}",
          htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Booking Delay Reversed</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background-color: #059669; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .booking-details { background-color: #ecfdf5; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .footer { background-color: #e5e7eb; padding: 15px; text-align: center; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Delay Reversed</h1>
  </div>
  <div class="content">
    <p>Dear {{userName}},</p>
    <p>The {{delayMinutes}} minute delay applied to your booking has been reversed.</p>
    <div class="booking-details">
      <h3>Restored Schedule</h3>
      <ul>
        <li><strong>Instrument:</strong> {{instrumentName}}</li>
        <li><strong>Delayed start:</strong> {{oldStartDate}}</li>
        <li><strong>Restored start:</strong> {{newStartDate}}</li>
        <li><strong>Restored end:</strong> {{newEndDate}}</li>
      </ul>
    </div>
    <p>Your booking is back to its original schedule.</p>
  </div>
  <div class="footer">
    <p>Lab Management System | Automated Email</p>
  </div>
</body>
</html>`
        });
      } else {
        setFormData({
          subject: `${activeTemplate.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}: MSLab Scheduler`,
          htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${activeTemplate.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,sans-serif;">
  <div style="text-align:center;padding:24px 0;background:#ffffff;border-bottom:1px solid #e5e7eb;">
    <img src="{{logoUrl}}" alt="MSLab Scheduler" style="max-height:64px;max-width:200px;border:0;display:block;margin:0 auto;">
  </div>
  <div style="max-width:600px;margin:0 auto;background:#ffffff;padding:32px;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <h1 style="color:#111827;font-size:24px;margin:0 0 16px;">${activeTemplate.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</h1>
    <p style="color:#4b5563;font-size:16px;line-height:1.6;">This is the default template for <strong>${activeTemplate}</strong>. Customize it in the Admin → Templates panel.</p>
  </div>
  <div style="max-width:600px;margin:0 auto;text-align:center;padding:24px;color:#6b7280;font-size:13px;">
    <a href="{{siteUrl}}" style="color:#4f46e5;text-decoration:none;">MSLab Scheduler</a><br>
    This is an automated email. Please do not reply.
  </div>
</body>
</html>`
        });
      }

      setHasChanges(false);
    }
  }, [emailTemplates, activeTemplate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await saveEmailTemplate({
        templateType: activeTemplate,
        subject: formData.subject,
        htmlContent: formData.htmlContent
      });
      setHasChanges(false);
    } catch (error) {
      console.error("Error saving email template:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSendTestEmail = async () => {
    if (!testEmail) {
      toast.error("Please enter a test email address");
      return;
    }
    
    setIsSendingTest(true);
    
    // Use current form data (not saved template) for testing
    let testSubject = formData.subject;

    const logoUrl = settings?.logo_url || settings?.favicon_url || `${window.location.origin}/lovable-uploads/40965317-613a-41b7-bc11-d9e8b6cba9ae.png`;
    const siteUrl = window.location.origin;
    const sampleData: Record<string, string> = {
      "{{userName}}": "John Doe",
      "{{instrumentName}}": "Sample Instrument XR-1000",
      "{{startDate}}": new Date().toLocaleString(),
      "{{endDate}}": new Date(Date.now() + 86400000).toLocaleString(),
      "{{status}}": "confirmed",
      "{{bookingDate}}": new Date().toLocaleDateString(),
      "{{commentBy}}": "Jane Smith",
      "{{commentAuthor}}": "Jane Smith",
      "{{commentContent}}": "This is a sample comment for testing purposes.",
      "{{commentTime}}": new Date().toLocaleString(),
      "{{delayMinutes}}": "45",
      "{{reason}}": "Instrument maintenance ran long",
      "{{oldStartDate}}": new Date().toLocaleString(),
      "{{newStartDate}}": new Date(Date.now() + 45 * 60000).toLocaleString(),
      "{{newEndDate}}": new Date(Date.now() + 165 * 60000).toLocaleString(),
      "{{bookingId}}": "00000000-0000-0000-0000-000000000000",
      "{{requesterName}}": "Alice Anderson",
      "{{recipientName}}": "Bob Brown",
      "{{notifications}}": `<li style="margin-bottom:8px;color:#4b5563;"><strong style="color:#111827;">Booking confirmed</strong> — Your booking is approved.</li><li style="margin-bottom:8px;color:#4b5563;"><strong style="color:#111827;">Comment added</strong> — A new comment was added.</li>`,
      "{{resetUrl}}": `${siteUrl}/reset-password?token=sample-token`,
      "{{sentAt}}": new Date().toLocaleString(),
      "{{logoUrl}}": logoUrl,
      "{{siteUrl}}": siteUrl,
      "{{title}}": formData.subject || "Email preview",
      "{{previewText}}": "You have a new notification from MSLab Scheduler.",
      "{{siteName}}": "MSLab Scheduler",
      "{{footerSiteName}}": "MSLab Scheduler",
      "{{footerTagline}}": "Lab Management System"
    };

    Object.entries(sampleData).forEach(([key, value]) => {
      testSubject = testSubject.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
    });

    try {
      console.log("Sending test template email...");
      const token = localStorage.getItem('standalone_auth_token');
      const res = await fetch('/api/functions/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`
        },
        body: JSON.stringify({
          to: testEmail,
          subject: testSubject,
          htmlContent: getPreviewContent(),
          templateType: null,
          variables: {}
        })
      });

      const json = await res.json().catch(() => ({ error: { message: 'Unknown error' } }));
      console.log("Test email response:", json);

      if (!res.ok || json.data?.success === false) {
        const message = json.data?.error || json.error?.message || `Failed to send (${res.status})`;
        throw new Error(message);
      }

      toast.success("Test email sent successfully!");
    } catch (error) {
      console.error("Error sending test email:", error);
      toast.error("Failed to send test email: " + (error instanceof Error ? error.message : String(error)));
    }
    
    setIsSendingTest(false);
  };

  const handleApplyStyle = async () => {
    setIsApplyingStyle(true);
    try {
      const token = localStorage.getItem('standalone_auth_token');
      const res = await fetch('/api/functions/apply-email-template-style', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`
        },
        body: JSON.stringify({ style: emailStyle })
      });
      const json = await res.json().catch(() => ({ error: { message: 'Unknown error' } }));
      if (!res.ok || json.data?.success === false) {
        throw new Error(json.data?.error || json.error?.message || `Failed to apply style (${res.status})`);
      }
      toast.success(`Applied ${emailStyle} email style to all templates`);
      await loadEmailTemplates();
      setHasChanges(false);
    } catch (error) {
      console.error('Error applying email style:', error);
      toast.error('Failed to apply email style: ' + (error instanceof Error ? error.message : String(error)));
    }
    setIsApplyingStyle(false);
  };

  const getPreviewContent = () => {
    let previewContent = formData.htmlContent || "";
    const logoUrl = settings?.logo_url || settings?.favicon_url || `${window.location.origin}/lovable-uploads/40965317-613a-41b7-bc11-d9e8b6cba9ae.png`;
    const siteUrl = window.location.origin;
    const sampleData: Record<string, string> = {
      "{{userName}}": "John Doe",
      "{{instrumentName}}": "Sample Instrument XR-1000",
      "{{startDate}}": new Date().toLocaleString(),
      "{{endDate}}": new Date(Date.now() + 86400000).toLocaleString(),
      "{{status}}": "confirmed",
      "{{bookingDate}}": new Date().toLocaleDateString(),
      "{{commentBy}}": "Jane Smith",
      "{{commentAuthor}}": "Jane Smith",
      "{{commentContent}}": "This is a sample comment for testing purposes.",
      "{{commentTime}}": new Date().toLocaleString(),
      "{{delayMinutes}}": "45",
      "{{reason}}": "Instrument maintenance ran long",
      "{{oldStartDate}}": new Date().toLocaleString(),
      "{{newStartDate}}": new Date(Date.now() + 45 * 60000).toLocaleString(),
      "{{newEndDate}}": new Date(Date.now() + 165 * 60000).toLocaleString(),
      "{{bookingId}}": "00000000-0000-0000-0000-000000000000",
      "{{requesterName}}": "Alice Anderson",
      "{{recipientName}}": "Bob Brown",
      "{{notifications}}": `<li style="margin-bottom:8px;color:#4b5563;"><strong style="color:#111827;">Booking confirmed</strong> — Your booking is approved.</li><li style="margin-bottom:8px;color:#4b5563;"><strong style="color:#111827;">Comment added</strong> — A new comment was added.</li>`,
      "{{resetUrl}}": `${siteUrl}/reset-password?token=sample-token`,
      "{{sentAt}}": new Date().toLocaleString(),
      "{{logoUrl}}": logoUrl,
      "{{siteUrl}}": siteUrl,
      "{{title}}": formData.subject || "Email preview",
      "{{previewText}}": "You have a new notification from MSLab Scheduler.",
      "{{siteName}}": "MSLab Scheduler",
      "{{footerSiteName}}": "MSLab Scheduler",
      "{{footerTagline}}": "Lab Management System"
    };

    Object.entries(sampleData).forEach(([key, value]) => {
      previewContent = previewContent.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
    });

    const logoHeader = logoUrl
      ? `<div style="text-align:center;padding:24px 0;border-bottom:1px solid #e5e7eb;"><a href="${siteUrl}" target="_blank" style="display:inline-block;"><img src="${logoUrl}" alt="MSLab Scheduler" style="max-height:64px;max-width:200px;border:0;display:block;margin:0 auto;"></a></div>`
      : "";

    const baseTag = `<base href="${siteUrl}">`;

    if (previewContent.trim() && !/^\s*<!(DOCTYPE|doctype)/i.test(previewContent) && !/<html/i.test(previewContent)) {
      previewContent = `<!DOCTYPE html><html><head>${baseTag}</head><body>${logoHeader}${previewContent}</body></html>`;
    }

    if (previewContent.includes("<body") && logoUrl && !previewContent.includes(logoUrl)) {
      previewContent = previewContent.replace(/<body([^>]*)>/i, `<body$1>${logoHeader}`);
    }

    if (!previewContent.includes("<base")) {
      previewContent = previewContent.replace(/(<head[^>]*>)/i, `$1${baseTag}`);
      if (!previewContent.includes("<head")) {
        previewContent = previewContent.replace(/<html([^>]*)>/i, `<html$1><head>${baseTag}</head>`);
      }
    }

    return previewContent;
  };

  const availableVariables: Record<string, string[]> = {
    welcome: ["{{userName}}", "{{logoUrl}}", "{{siteUrl}}"],
    booking_confirmation: ["{{userName}}", "{{instrumentName}}", "{{startDate}}", "{{endDate}}", "{{status}}", "{{logoUrl}}", "{{siteUrl}}"],
    booking_update: ["{{userName}}", "{{instrumentName}}", "{{startDate}}", "{{endDate}}", "{{status}}", "{{logoUrl}}", "{{siteUrl}}"],
    booking_approved: ["{{userName}}", "{{instrumentName}}", "{{startDate}}", "{{endDate}}", "{{status}}", "{{logoUrl}}", "{{siteUrl}}"],
    booking_denied: ["{{userName}}", "{{instrumentName}}", "{{startDate}}", "{{endDate}}", "{{status}}", "{{logoUrl}}", "{{siteUrl}}"],
    comment_notification: ["{{userName}}", "{{instrumentName}}", "{{startDate}}", "{{endDate}}", "{{bookingDate}}", "{{commentBy}}", "{{commentContent}}", "{{commentTime}}", "{{logoUrl}}", "{{siteUrl}}"],
    booking_delayed: ["{{userName}}", "{{instrumentName}}", "{{delayMinutes}}", "{{reason}}", "{{oldStartDate}}", "{{newStartDate}}", "{{newEndDate}}", "{{logoUrl}}", "{{siteUrl}}"],
    booking_delay_reversed: ["{{userName}}", "{{instrumentName}}", "{{delayMinutes}}", "{{oldStartDate}}", "{{newStartDate}}", "{{newEndDate}}", "{{logoUrl}}", "{{siteUrl}}"],
    waitlist_filled: ["{{userName}}", "{{instrumentName}}", "{{startDate}}", "{{endDate}}", "{{status}}", "{{bookingId}}", "{{logoUrl}}", "{{siteUrl}}"],
    swap_status: ["{{requesterName}}", "{{recipientName}}", "{{status}}", "{{logoUrl}}", "{{siteUrl}}"],
    notification_digest: ["{{userName}}", "{{notifications}}", "{{logoUrl}}", "{{siteUrl}}"],
    password_reset: ["{{resetUrl}}", "{{userName}}", "{{logoUrl}}", "{{siteUrl}}"],
    smtp_test: ["{{sentAt}}", "{{logoUrl}}", "{{siteUrl}}"]
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Email Templates</h3>
          <p className="text-sm text-muted-foreground">
            Customize the HTML templates used for email notifications.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-lg border p-4">
          <div className="space-y-1">
            <Label htmlFor="emailStyle" className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Email design style
            </Label>
            <p className="text-sm text-muted-foreground">
              Choose a global style and apply it to all templates. Existing template edits will be overwritten.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={emailStyle} onValueChange={setEmailStyle}>
              <SelectTrigger id="emailStyle" className="w-40">
                <SelectValue placeholder="Style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="modern">Modern</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              onClick={handleApplyStyle}
              disabled={isApplyingStyle}
            >
              {isApplyingStyle ? "Applying..." : "Apply"}
            </Button>
          </div>
        </div>

        <Tabs value={activeTemplate} onValueChange={setActiveTemplate}>
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="welcome">Welcome</TabsTrigger>
            <TabsTrigger value="booking_confirmation">Booking Confirmation</TabsTrigger>
            <TabsTrigger value="booking_update">Booking Update</TabsTrigger>
            <TabsTrigger value="booking_approved">Booking Approved</TabsTrigger>
            <TabsTrigger value="booking_denied">Booking Denied</TabsTrigger>
            <TabsTrigger value="comment_notification">Comment Added</TabsTrigger>
            <TabsTrigger value="booking_delayed">Booking Delayed</TabsTrigger>
            <TabsTrigger value="booking_delay_reversed">Delay Reversed</TabsTrigger>
            <TabsTrigger value="waitlist_filled">Waitlist Filled</TabsTrigger>
            <TabsTrigger value="swap_status">Swap Status</TabsTrigger>
            <TabsTrigger value="notification_digest">Digest</TabsTrigger>
            <TabsTrigger value="password_reset">Password Reset</TabsTrigger>
            <TabsTrigger value="smtp_test">SMTP Test</TabsTrigger>
          </TabsList>


          <TabsContent value={activeTemplate} className="mt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Email Subject</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => handleInputChange("subject", e.target.value)}
                  placeholder="Email subject with variables like {{instrumentName}}"
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="htmlContent">HTML Content</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPreview(!showPreview)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {showPreview ? "Hide Preview" : "Show Preview"}
                  </Button>
                </div>
                <Textarea
                  id="htmlContent"
                  value={formData.htmlContent}
                  onChange={(e) => handleInputChange("htmlContent", e.target.value)}
                  placeholder="HTML email template content"
                  className="min-h-[400px] font-mono text-sm"
                  required
                />
              </div>

              {showPreview && (
                <div className="border rounded-lg p-4 space-y-2">
                  <h4 className="font-medium">Live Preview (with sample data):</h4>
                  <iframe
                    title="Email preview"
                    srcDoc={getPreviewContent()}
                    sandbox="allow-same-origin"
                    style={{ width: "100%", height: "500px", border: "1px solid #e5e7eb", borderRadius: "6px", backgroundColor: "#f3f4f6" }}
                  />
                </div>
              )}

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Available Variables:</h4>
                <div className="flex flex-wrap gap-2">
                  {availableVariables[activeTemplate as keyof typeof availableVariables]?.map(variable => (
                    <span key={variable} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                      {variable}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 items-center">
                <Button 
                  type="submit" 
                  disabled={isLoading || isSaving || !hasChanges}
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? "Saving..." : "Save Template"}
                </Button>
                
                {hasChanges && (
                  <p className="text-sm text-amber-600 flex items-center">
                    You have unsaved changes
                  </p>
                )}
              </div>
            </form>

            <div className="border-t pt-6 mt-6">
              <h4 className="text-md font-semibold mb-4">Test Email Template</h4>
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label htmlFor="testTemplateEmail">Test Email Address</Label>
                  <Input
                    id="testTemplateEmail"
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="test@example.com"
                  />
                </div>
                <Button 
                  onClick={handleSendTestEmail}
                  disabled={!testEmail || isSendingTest}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  {isSendingTest ? "Sending..." : "Send Test Template"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                This will send the current template (even if not saved) with sample data to test the formatting.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  );
};

export default EmailTemplatesManagement;
