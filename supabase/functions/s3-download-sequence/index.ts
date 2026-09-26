import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { loadS3Config, getS3Client, buildObjectUrl } from "../_shared/s3Client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Expose-Headers": "Content-Disposition",
};

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

    const url = new URL(req.url);
    const bookingId = url.searchParams.get("bookingId");
    if (!bookingId) {
      return new Response(JSON.stringify({ error: "Missing bookingId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: booking, error } = await supabase
      .from("bookings")
      .select("sequence_file_key, sequence_file_name")
      .eq("id", bookingId)
      .single();
    if (error || !booking?.sequence_file_key) {
      return new Response(JSON.stringify({ error: "No sequence file" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cfg = loadS3Config();
    const client = getS3Client(cfg);
    const objUrl = buildObjectUrl(cfg, booking.sequence_file_key);
    const resp = await client.fetch(objUrl, { method: "GET" });
    if (!resp.ok) {
      const t = await resp.text();
      console.error("S3 GET failed", resp.status, t);
      return new Response(JSON.stringify({ error: "File not found in storage" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const filename = (booking.sequence_file_name || "sequence-file").replace(/"/g, "");
    return new Response(resp.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": resp.headers.get("Content-Type") || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": resp.headers.get("Content-Length") || "",
      },
    });
  } catch (err) {
    console.error("Download error", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
