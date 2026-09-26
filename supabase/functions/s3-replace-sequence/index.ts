import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { loadS3Config, getS3Client, buildObjectUrl } from "../_shared/s3Client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MAX_SIZE = 25 * 1024 * 1024; // 25 MB
const ALLOWED_EXT = [".xlsx", ".xls", ".csv"];

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
      .select("s3_uploads_enabled")
      .limit(1)
      .single();
    if (!settings?.s3_uploads_enabled) {
      return new Response(JSON.stringify({ error: "Sequence file uploads are disabled" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // Verify booking + ownership/admin
    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select("id, user_id, sequence_file_key, sequence_file_name")
      .eq("id", bookingId)
      .single();
    if (bookingErr || !booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!booking.sequence_file_key) {
      return new Response(JSON.stringify({ error: "No existing sequence file to replace" }), {
        status: 400,
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

    // Validate extension matches the existing file's extension (don't switch formats)
    const existingName = booking.sequence_file_name || booking.sequence_file_key;
    const existingExt = ALLOWED_EXT.find((ext) => existingName.toLowerCase().endsWith(ext));
    if (!existingExt) {
      return new Response(JSON.stringify({ error: "Existing file has unsupported type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const newExt = ALLOWED_EXT.find((ext) => file.name.toLowerCase().endsWith(ext));
    if (newExt !== existingExt) {
      return new Response(
        JSON.stringify({
          error: `File extension mismatch — must keep the same format (${existingExt})`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Overwrite the existing object at the same key
    const cfg = loadS3Config();
    const client = getS3Client(cfg);
    const key = booking.sequence_file_key;
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

    // Update only size + uploaded_at; preserve key + name
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const uploadedAt = new Date().toISOString();
    const { error: updErr } = await adminClient
      .from("bookings")
      .update({
        sequence_file_size: file.size,
        sequence_file_uploaded_at: uploadedAt,
      })
      .eq("id", bookingId);
    if (updErr) {
      console.error("Failed to update booking row", updErr);
      return new Response(JSON.stringify({ error: "Saved to S3 but DB update failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        key,
        name: booking.sequence_file_name,
        size: file.size,
        uploadedAt,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Replace error", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
