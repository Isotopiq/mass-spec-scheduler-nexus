import { supabase } from "../integrations/supabase/client";
import { shouldSendEmail } from "./emailPreferences";

export interface EmailNotification {
  to: string;
  subject: string;
  body: string;
  htmlContent?: string;
  templateType?: string;
  variables?: Record<string, string>;
}

export const sendEmail = async (notification: EmailNotification & { emailType?: 'notification' | 'reminder' }): Promise<boolean> => {
  // Check if user has opted in for this type of email - default to true if no emailType specified
  if (notification.emailType && !shouldSendEmail(notification.emailType)) {
    console.log(`Email sending skipped - user has opted out of ${notification.emailType} emails`);
    return false;
  }

  try {
    console.log("Preparing to send email notification:", {
      to: notification.to,
      subject: notification.subject,
      templateType: notification.templateType,
      hasVariables: !!notification.variables && Object.keys(notification.variables).length > 0,
      variables: notification.variables
    });
    
    // Ensure all variables have string values and handle undefined/null
    const safeVariables: Record<string, string> = {};
    if (notification.variables) {
      Object.entries(notification.variables).forEach(([key, value]) => {
        safeVariables[key] = value != null ? String(value) : "";
      });
    }
    
    const emailPayload = {
      to: notification.to,
      subject: notification.subject,
      htmlContent: notification.htmlContent || `<p>${notification.body.replace(/\n/g, '<br>')}</p>`,
      templateType: notification.templateType || null,
      variables: safeVariables
    };
    
    console.log("Calling send-email function with payload:", emailPayload);
    
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: emailPayload
    });

    if (error) {
      console.error("Email sending error from function invoke:", error);
      throw error;
    }

    console.log("Email function response received:", data);

    if (data && !data.success) {
      console.error("Email sending failed:", data.error || data);
      throw new Error(data.error || "Email sending failed");
    }

    console.log(`Email sent successfully to ${notification.to}:`, data);
    return true;
  } catch (error) {
    console.error("Failed to send email - full error:", error);
    return false;
  }
};

export const createWelcomeNotification = (
  userEmail: string, 
  userName: string
): EmailNotification => {
  return {
    to: userEmail,
    subject: `Welcome to Lab Management System, ${userName}!`,
    body: `
Dear ${userName},

Welcome to our lab management platform! We're excited to have you join our community.

Your account has been successfully created and you're ready to start managing your laboratory instruments and bookings.

What you can do now:
- Book instruments and manage your reservations
- Browse available laboratory instruments
- Track your usage and booking history
- Collaborate with team members through comments

Thank you for joining the Lab Management System.

Best regards,
Lab Management Team
    `,
    templateType: "welcome",
    variables: {
      userName: userName || ""
    }
  };
};

export const createBookingNotification = (
  userEmail: string, 
  userName: string,
  instrumentName: string, 
  startDate: string, 
  endDate: string
): EmailNotification => {
  return {
    to: userEmail,
    subject: `Booking Confirmation: ${instrumentName}`,
    body: `
Dear ${userName},

Your booking for ${instrumentName} has been confirmed.
Date and Time: ${new Date(startDate).toLocaleString()} - ${new Date(endDate).toLocaleString()}

Thank you for using the Lab Management System.

Best regards,
Lab Management Team
    `,
    templateType: "booking_confirmation",
    variables: {
      userName: userName || "",
      instrumentName: instrumentName || "",
      startDate: new Date(startDate).toLocaleString(),
      endDate: new Date(endDate).toLocaleString(),
      status: "confirmed"
    }
  };
};

export const createStatusUpdateNotification = (
  userEmail: string, 
  userName: string,
  instrumentName: string, 
  status: string
): EmailNotification => {
  return {
    to: userEmail,
    subject: `Booking Status Update: ${instrumentName}`,
    body: `
Dear ${userName},

Your booking for ${instrumentName} has been updated.
New status: ${status}

Thank you for using the Lab Management System.

Best regards,
Lab Management Team
    `,
    templateType: "booking_update",
    variables: {
      userName: userName || "",
      instrumentName: instrumentName || "",
      startDate: new Date().toLocaleString(),
      endDate: new Date().toLocaleString(),
      status: status || ""
    }
  };
};

export const createDelayNotification = (
  userEmail: string,
  userName: string,
  instrumentName: string,
  delayMinutes: number,
  oldStart: string,
  newStart: string,
  newEnd: string,
  reason?: string
): EmailNotification => {
  const oldStartDate = new Date(oldStart).toLocaleString();
  const newStartDate = new Date(newStart).toLocaleString();
  const newEndDate = new Date(newEnd).toLocaleString();
  const reasonText = reason && reason.trim().length > 0 ? reason.trim() : "Scheduling adjustment";

  return {
    to: userEmail,
    subject: `Booking Delayed: ${instrumentName}`,
    body: `
Dear ${userName},

Your booking for ${instrumentName} has been pushed back by ${delayMinutes} minutes.

Reason: ${reasonText}

Previous start: ${oldStartDate}
New start: ${newStartDate}
New end: ${newEndDate}

Please adjust your schedule accordingly.

Thank you for your understanding.

Best regards,
Lab Management Team
    `,
    templateType: "booking_delayed",
    variables: {
      userName: userName || "",
      instrumentName: instrumentName || "",
      delayMinutes: delayMinutes ? delayMinutes.toString() : "0",
      reason: reasonText,
      oldStartDate,
      newStartDate,
      newEndDate,
      startDate: newStartDate,
      endDate: newEndDate
    }
  };
};

export const createDelayReversalNotification = (
  userEmail: string,
  userName: string,
  instrumentName: string,
  delayMinutes: number,
  oldStart: string,
  newStart: string,
  newEnd: string
): EmailNotification => {
  const oldStartDate = new Date(oldStart).toLocaleString();
  const newStartDate = new Date(newStart).toLocaleString();
  const newEndDate = new Date(newEnd).toLocaleString();

  return {
    to: userEmail,
    subject: `Booking Delay Reversed: ${instrumentName}`,
    body: `
Dear ${userName},

The ${delayMinutes} minute delay applied to your booking for ${instrumentName} has been reversed.

Delayed start: ${oldStartDate}
Restored start: ${newStartDate}
Restored end: ${newEndDate}

Your booking is back to its original schedule.

Best regards,
Lab Management Team
    `,
    templateType: "booking_delay_reversed",
    variables: {
      userName: userName || "",
      instrumentName: instrumentName || "",
      delayMinutes: delayMinutes ? delayMinutes.toString() : "0",
      reason: "",
      oldStartDate,
      newStartDate,
      newEndDate,
      startDate: newStartDate,
      endDate: newEndDate
    }
  };
};


export const createCommentNotification = (
  userEmail: string,
  userName: string,
  instrumentName: string,
  commentBy: string,
  commentContent: string,
  bookingDate: string
): EmailNotification => {
  console.log("Creating comment notification with params:", {
    userEmail,
    userName,
    instrumentName,
    commentBy,
    commentContent,
    bookingDate
  });

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h2 style="color: #333; margin-bottom: 20px; border-bottom: 2px solid #007bff; padding-bottom: 10px;">New Comment on Your Booking</h2>
        
        <div style="margin-bottom: 20px;">
          <p style="margin: 5px 0;"><strong>Dear ${userName},</strong></p>
          <p style="margin: 5px 0;"><strong>Instrument:</strong> ${instrumentName}</p>
          <p style="margin: 5px 0;"><strong>Booking Date:</strong> ${bookingDate}</p>
          <p style="margin: 5px 0;"><strong>Comment by:</strong> ${commentBy}</p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0;">
          <h4 style="margin: 0 0 10px 0; color: #333;">Comment:</h4>
          <p style="margin: 0; line-height: 1.5;">${commentContent}</p>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666;">
          <p>Best regards,<br>Lab Management Team</p>
        </div>
      </div>
    </div>
  `;

  const notification = {
    to: userEmail,
    subject: `New Comment on Your Booking: ${instrumentName}`,
    body: `
Dear ${userName},

A new comment has been added to your booking for ${instrumentName}.

Comment by: ${commentBy}
Comment: ${commentContent}
Booking Date: ${bookingDate}

Thank you for using the Lab Management System.

Best regards,
Lab Management Team
    `,
    htmlContent: htmlContent,
    templateType: "comment_notification",
    variables: {
      userName: userName || "",
      instrumentName: instrumentName || "",
      commentBy: commentBy || "",
      commentContent: commentContent || "",
      bookingDate: bookingDate || ""
    }
  };

  console.log("Created comment notification:", notification);
  return notification;
};
