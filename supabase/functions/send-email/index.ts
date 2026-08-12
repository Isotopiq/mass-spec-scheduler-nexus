
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  subject: string;
  htmlContent: string;
  templateType: string | null;
  variables: Record<string, string>;
}

// Improved SMTP client implementation with proper TLS handling
async function sendSMTPEmail(
  host: string,
  port: number,
  username: string,
  password: string,
  useTls: boolean,
  fromEmail: string,
  fromName: string,
  to: string,
  subject: string,
  htmlContent: string
) {
  let conn: Deno.TcpConn | Deno.TlsConn | null = null;
  
  try {
    console.log(`Connecting to SMTP server: ${host}:${port}, TLS: ${useTls}`);
    
    // Connect to SMTP server - use TLS directly for port 465, otherwise start plain
    if (port === 465 && useTls) {
      // Direct TLS connection (SMTPS)
      conn = await Deno.connectTls({
        hostname: host,
        port: port,
      });
      console.log("Connected with direct TLS (SMTPS)");
    } else {
      // Plain connection (will upgrade to TLS if needed)
      conn = await Deno.connect({
        hostname: host,
        port: port,
      });
      console.log("Connected with plain connection");
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Helper function to read response with timeout
    async function readResponse(): Promise<string> {
      const buffer = new Uint8Array(4096);
      const n = await conn!.read(buffer);
      if (n === null) throw new Error("Connection closed unexpectedly");
      const response = decoder.decode(buffer.subarray(0, n));
      return response.trim();
    }

    // Helper function to send command and get response
    async function sendCommand(command: string): Promise<string> {
      console.log(`> ${command.replace(/AUTH PLAIN .+/, 'AUTH PLAIN [HIDDEN]')}`);
      await conn!.write(encoder.encode(command + "\r\n"));
      const response = await readResponse();
      console.log(`< ${response}`);
      
      // Check for SMTP error responses
      const responseCode = parseInt(response.substring(0, 3));
      if (responseCode >= 400) {
        throw new Error(`SMTP Error ${responseCode}: ${response}`);
      }
      
      return response;
    }

    // SMTP handshake
    const greeting = await readResponse();
    console.log(`< ${greeting}`);
    
    if (!greeting.startsWith('220')) {
      throw new Error(`Invalid SMTP greeting: ${greeting}`);
    }

    // Send EHLO
    await sendCommand(`EHLO ${host}`);
    
    // Handle STARTTLS for non-465 ports
    if (useTls && port !== 465) {
      console.log("Initiating STARTTLS...");
      const startTlsResponse = await sendCommand("STARTTLS");
      
      if (startTlsResponse.startsWith('220')) {
        // Upgrade connection to TLS
        console.log("Upgrading connection to TLS...");
        const tlsConn = await Deno.startTls(conn as Deno.TcpConn, {
          hostname: host,
        });
        conn.close();
        conn = tlsConn;
        console.log("TLS upgrade successful");
        
        // Send EHLO again after TLS upgrade
        await sendCommand(`EHLO ${host}`);
      } else {
        throw new Error(`STARTTLS failed: ${startTlsResponse}`);
      }
    }

    // Authenticate using AUTH PLAIN
    console.log("Authenticating...");
    const authString = btoa(`\0${username}\0${password}`);
    await sendCommand("AUTH PLAIN " + authString);

    // Send email
    console.log("Sending email...");
    await sendCommand(`MAIL FROM:<${fromEmail}>`);
    await sendCommand(`RCPT TO:<${to}>`);
    await sendCommand("DATA");

    // Prepare email content
    const emailContent = [
      `From: ${fromName} <${fromEmail}>`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `Content-Type: text/html; charset=UTF-8`,
      `MIME-Version: 1.0`,
      `Date: ${new Date().toUTCString()}`,
      ``,
      htmlContent,
      `.`
    ].join("\r\n");

    console.log("Sending email data...");
    await conn.write(encoder.encode(emailContent + "\r\n"));
    const dataResponse = await readResponse();
    console.log("Email data sent, response:", dataResponse);
    
    if (!dataResponse.startsWith('250')) {
      throw new Error(`Email sending failed: ${dataResponse}`);
    }

    await sendCommand("QUIT");
    console.log("Email sent successfully via SMTP");
    return true;
    
  } catch (error) {
    console.error("SMTP Error:", error);
    throw new Error(`SMTP sending failed: ${error.message}`);
  } finally {
    if (conn) {
      try {
        conn.close();
      } catch (e) {
        console.log("Error closing connection:", e);
      }
    }
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Authentication: only signed-in users may trigger emails ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await anonClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { to, subject, htmlContent, templateType, variables }: EmailRequest = await req.json();

    // --- Authorization: users may only email themselves or lab members;
    // arbitrary external recipients are restricted to admins ---
    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("role, email")
      .eq("id", userData.user.id)
      .maybeSingle();

    const isAdmin = callerProfile?.role === "admin";
    if (!isAdmin) {
      const isSelf =
        typeof to === "string" &&
        to.toLowerCase() === (userData.user.email ?? "").toLowerCase();

      let isLabMember = false;
      if (!isSelf && typeof to === "string") {
        const { data: recipient } = await supabase
          .from("profiles")
          .select("id")
          .ilike("email", to)
          .maybeSingle();
        isLabMember = !!recipient;
      }

      if (!isSelf && !isLabMember) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Forbidden: you may only send email to registered lab members",
          }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }


    console.log("Email request received:", { 
      to, 
      subject, 
      templateType, 
      variables: variables ? Object.keys(variables) : [],
      variableValues: variables
    });

    // Validate email parameters
    if (!to || !to.includes('@')) {
      throw new Error("Invalid recipient email address");
    }

    // Get SMTP settings from database
    const { data: smtpData, error: smtpError } = await supabase
      .from('smtp_settings')
      .select('*')
      .maybeSingle();

    if (smtpError) {
      console.error("SMTP settings error:", smtpError);
      throw new Error("Failed to load SMTP settings: " + smtpError.message);
    }

    if (!smtpData) {
      throw new Error("SMTP settings not configured. Please configure SMTP settings in the admin panel.");
    }

    // Validate SMTP settings
    if (!smtpData.host || !smtpData.username || !smtpData.password || !smtpData.from_email) {
      throw new Error("Incomplete SMTP settings. Please check host, username, password, and from_email.");
    }

    console.log("SMTP settings loaded:", { 
      host: smtpData.host, 
      port: smtpData.port, 
      username: smtpData.username,
      useTls: smtpData.use_tls,
      fromEmail: smtpData.from_email 
    });

    // Get email template if specified
    let finalSubject = subject;
    let finalHtmlContent = htmlContent;

    if (templateType) {
      console.log("Loading template:", templateType);
      const { data: templateData, error: templateError } = await supabase
        .from('email_templates')
        .select('*')
        .eq('template_type', templateType)
        .maybeSingle();

      if (templateError) {
        console.error("Template loading error:", templateError);
      }

      if (templateData) {
        finalSubject = templateData.subject;
        finalHtmlContent = templateData.html_content;
        console.log("Template loaded successfully:", { 
          templateType, 
          subject: finalSubject,
          contentLength: finalHtmlContent.length 
        });
      } else {
        console.log("No template found for type:", templateType, "using provided content");
      }
    }

    // Replace variables in subject and content with proper error handling
    if (variables && Object.keys(variables).length > 0) {
      console.log("Replacing variables:", variables);
      Object.entries(variables).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;
        const safeValue = value != null ? String(value) : ""; // Handle undefined/null values safely
        const regex = new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g');
        
        finalSubject = finalSubject.replace(regex, safeValue);
        finalHtmlContent = finalHtmlContent.replace(regex, safeValue);
        
        console.log(`Replaced ${placeholder} with: ${safeValue}`);
      });
      console.log("Variable replacement completed");
    }

    // Log final email content for debugging
    console.log("Final email details:", {
      to,
      subject: finalSubject,
      contentPreview: finalHtmlContent.substring(0, 200) + "...",
      contentLength: finalHtmlContent.length
    });

    console.log("Attempting to send email via SMTP...");

    // Actually send the email using SMTP
    await sendSMTPEmail(
      smtpData.host,
      smtpData.port,
      smtpData.username,
      smtpData.password,
      smtpData.use_tls,
      smtpData.from_email,
      smtpData.from_name,
      to,
      finalSubject,
      finalHtmlContent
    );

    console.log("Email sent successfully via SMTP");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email sent successfully",
        emailData: {
          to,
          subject: finalSubject,
          from: `${smtpData.from_name} <${smtpData.from_email}>`,
          contentLength: finalHtmlContent.length
        }
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Failed to send email",
        success: false,
        details: error.toString()
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
