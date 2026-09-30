import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { loadS3Config, getS3Client, buildObjectUrl } from "../_shared/s3Client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MAX_SIZE = 25 * 1024 * 1024; // 25 MB
const ALLOWED_EXT = [".xlsx", ".xls", ".csv"];

function safeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // Check uploads enabled
    const { data: settings } = await supabase
      .from("app_settings")
      .select("s3_uploads_enabled, s3_path_prefix")
      .limit(1)
      .single();
    if (!settings?.s3_uploads_enabled) {
      return new Response(JSON.stringify({ error: "Sequence file uploads are disabled" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse multipart form
    const form = await req.formData();
    const file = form.get("file");
    const bookingId = form.get("bookingId");
    if (!(file instanceof File) || typeof bookingId !== "string" || !bookingId) {
      return new Response(JSON.stringify({ error: "Missing file or bookingId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (file.size > MAX_SIZE) {
      return new Response(
        JSON.stringify({ error: `File too large (max ${MAX_SIZE / 1024 / 1024} MB)` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const lowerName = file.name.toLowerCase();
    if (!ALLOWED_EXT.some((ext) => lowerName.endsWith(ext))) {
      return new Response(
        JSON.stringify({ error: `File type not allowed. Allowed: ${ALLOWED_EXT.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Verify ownership or admin
    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select("id, user_id, sequence_file_key")
      .eq("id", bookingId)
      .single();
    if (bookingErr || !booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();
    const isAdmin = profile?.role === "admin";
    if (booking.user_id !== userId && !isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build key and upload
    const cfg = loadS3Config();
    const client = getS3Client(cfg);
    const prefix = (settings.s3_path_prefix || "lcms-sequences/").replace(/^\/+/, "");
    const ts = Date.now();
    const key = `${prefix}${bookingId}/${ts}-${safeFilename(file.name)}`;
    const url = buildObjectUrl(cfg, key);
    const body = new Uint8Array(await file.arrayBuffer());

    const putResp = await client.fetch(url, {
      method: "PUT",
      body,
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "Content-Length": String(body.byteLength),
      },
    });
    if (!putResp.ok) {
      const errText = await putResp.text();
      console.error("S3 PUT failed", putResp.status, errText);
      return new Response(
        JSON.stringify({ error: `Upload failed: ${putResp.status} ${errText.slice(0, 300)}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    await putResp.text();

    // Best-effort delete previous file
    if (booking.sequence_file_key && booking.sequence_file_key !== key) {
      try {
        const oldUrl = buildObjectUrl(cfg, booking.sequence_file_key);
        await client.fetch(oldUrl, { method: "DELETE" }).then((r) => r.text());
      } catch (e) {
        console.warn("Failed to delete previous sequence file", e);
      }
    }

    // Update booking row (use service role to bypass RLS update restrictions for admins editing others)
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { error: updErr } = await adminClient
      .from("bookings")
      .update({
        sequence_file_key: key,
        sequence_file_name: file.name,
        sequence_file_size: file.size,
        sequence_file_uploaded_at: new Date().toISOString(),
      })
      .eq("id", bookingId);
    if (updErr) {
      console.error("Failed to update booking row", updErr);
      return new Response(JSON.stringify({ error: "Upload succeeded but DB update failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ ok: true, key, name: file.name, size: file.size }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Upload error", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
