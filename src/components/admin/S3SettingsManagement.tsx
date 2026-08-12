import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase, SUPABASE_FUNCTIONS_URL } from "../../integrations/supabase/client";
import { useAppSettings } from "../../hooks/useAppSettings";

const S3SettingsManagement: React.FC = () => {
  const { settings, isLoading, reload } = useAppSettings();
  const [enabled, setEnabled] = useState(false);
  const [prefix, setPrefix] = useState("lcms-sequences/");
  const [endpointDisplay, setEndpointDisplay] = useState("");
  const [bucketDisplay, setBucketDisplay] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<
    | null
    | { ok: true; endpoint: string; bucket: string; region: string; forcePathStyle: boolean }
    | { ok: false; error: string; status?: number }
  >(null);

  useEffect(() => {
    if (settings) {
      setEnabled(settings.s3_uploads_enabled);
      setPrefix(settings.s3_path_prefix);
      setEndpointDisplay(settings.s3_endpoint_display || "");
      setBucketDisplay(settings.s3_bucket_display || "");
    }
  }, [settings]);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase
      .from("app_settings")
      .update({
        s3_uploads_enabled: enabled,
        s3_path_prefix: prefix.endsWith("/") ? prefix : prefix + "/",
        s3_endpoint_display: endpointDisplay || null,
        s3_bucket_display: bucketDisplay || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", settings.id);
    setSaving(false);
    if (error) {
      toast.error("Failed to save settings");
    } else {
      toast.success("Settings saved");
      reload();
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const resp = await fetch(
        `${SUPABASE_FUNCTIONS_URL}/s3-test-connection`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } },
      );
      const json = await resp.json();
      setTestResult(json);
      if (json.ok) {
        toast.success("Connection successful");
        // Auto-fill display fields if blank
        if (!endpointDisplay) setEndpointDisplay(json.endpoint);
        if (!bucketDisplay) setBucketDisplay(json.bucket);
      } else {
        toast.error("Connection failed — check details below");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Test failed";
      setTestResult({ ok: false, error: msg });
      toast.error(msg);
    } finally {
      setTesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>S3 Storage for Sequence Files</CardTitle>
          <CardDescription>
            Configure your S3-compatible server (MinIO, Ceph, Wasabi, Backblaze, etc.) for
            optional LCMS sequence file uploads on bookings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-md border bg-muted/30 p-4 text-sm space-y-2">
            <p className="font-medium">Required secrets (set via Lovable secret prompt):</p>
            <ul className="list-disc pl-5 text-muted-foreground space-y-0.5">
              <li><code>S3_ENDPOINT</code> — e.g. <code>https://s3.mylab.example.com</code></li>
              <li><code>S3_REGION</code> — e.g. <code>us-east-1</code> (any string for most servers)</li>
              <li><code>S3_BUCKET</code> — bucket name</li>
              <li><code>S3_ACCESS_KEY_ID</code></li>
              <li><code>S3_SECRET_ACCESS_KEY</code></li>
              <li><code>S3_FORCE_PATH_STYLE</code> — <code>true</code> for MinIO/Ceph, <code>false</code> for virtual-hosted style</li>
            </ul>
            <p className="text-muted-foreground pt-2">
              All credentials are stored as encrypted secrets — never in the database or browser.
              Files are proxied through our edge functions, so your S3 server doesn't need
              public CORS configuration.
            </p>
          </div>

          <div>
            <Button onClick={handleTest} disabled={testing} variant="outline">
              {testing ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Testing...</>
              ) : (
                "Test Connection"
              )}
            </Button>
            {testResult && (
              <div
                className={`mt-3 rounded-md border p-3 text-sm ${
                  testResult.ok
                    ? "border-green-200 bg-green-50 text-green-900"
                    : "border-red-200 bg-red-50 text-red-900"
                }`}
              >
                {testResult.ok ? (
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-medium">Connection successful</div>
                      <div className="text-xs mt-1">
                        Endpoint: {testResult.endpoint} · Bucket: {testResult.bucket} ·
                        Region: {testResult.region} ·{" "}
                        {testResult.forcePathStyle ? "path-style" : "virtual-hosted"}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-medium">Connection failed</div>
                      <div className="text-xs mt-1 break-all">{(testResult as { ok: false; error: string; status?: number }).error}</div>
                      {(testResult as { ok: false; error: string; status?: number }).status && (
                        <div className="text-xs">HTTP {(testResult as { ok: false; error: string; status?: number }).status}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between rounded-md border p-4">
            <div>
              <Label className="text-base">Enable sequence file uploads on bookings</Label>
              <p className="text-sm text-muted-foreground">
                When on, an optional upload field appears on every booking form.
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          {!testResult?.ok && enabled && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                You haven't successfully tested the connection yet. Uploads may fail until
                credentials are correct.
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="prefix">Storage path prefix</Label>
            <Input
              id="prefix"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="lcms-sequences/"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Files will be stored under this prefix in your bucket. Trailing slash will be added if missing.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="endpoint-display">Endpoint (display only)</Label>
              <Input
                id="endpoint-display"
                value={endpointDisplay}
                onChange={(e) => setEndpointDisplay(e.target.value)}
                placeholder="https://s3.mylab.example.com"
              />
            </div>
            <div>
              <Label htmlFor="bucket-display">Bucket (display only)</Label>
              <Input
                id="bucket-display"
                value={bucketDisplay}
                onChange={(e) => setBucketDisplay(e.target.value)}
                placeholder="lab-files"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                "Save Settings"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default S3SettingsManagement;
