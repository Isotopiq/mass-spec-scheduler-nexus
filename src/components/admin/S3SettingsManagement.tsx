import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../integrations/supabase/client";

const API_URL = import.meta.env.VITE_API_URL || "";

const DEFAULT_S3_SETTINGS = {
  provider: "local" as "local" | "s3",
  endpoint: "",
  region: "us-east-1",
  bucket: "",
  accessKeyId: "",
  secretAccessKey: "",
  forcePathStyle: false,
  pathPrefix: "lcms-sequences/",
  uploadsEnabled: false,
  hasSecret: false,
};

const S3SettingsManagement: React.FC = () => {
  const [settings, setSettings] = useState(DEFAULT_S3_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] =
    React.useState<
      | null
      | { ok: true; endpoint: string; bucket: string; region: string; forcePathStyle: boolean }
      | { ok: false; error: string; status?: number }
    >(null);

  const loadSettings = useCallback(async () => {
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const res = await fetch(`${API_URL}/api/admin/s3-settings`, {
        headers: { Authorization: `Bearer ${token || ""}` },
      });
      const json = await res.json().catch(() => ({}));
      if (json.data) {
        setSettings({
          provider: json.data.provider === "s3" ? "s3" : "local",
          endpoint: json.data.endpoint || "",
          region: json.data.region || "us-east-1",
          bucket: json.data.bucket || "",
          accessKeyId: json.data.accessKeyId || "",
          secretAccessKey: "",
          forcePathStyle: !!json.data.forcePathStyle,
          pathPrefix: json.data.pathPrefix || "lcms-sequences/",
          uploadsEnabled: !!json.data.uploadsEnabled,
          hasSecret: !!json.data.hasSecret,
        });
      }
    } catch (e) {
      console.error("Failed to load S3 settings", e);
      toast.error("Failed to load S3 settings");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const normalizedPrefix = (prefix: string) =>
    prefix.endsWith("/") ? prefix : prefix + "/";

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const res = await fetch(`${API_URL}/api/admin/s3-settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify({
          s3_provider: settings.provider,
          s3_endpoint: settings.endpoint || null,
          s3_region: settings.region || null,
          s3_bucket: settings.bucket || null,
          s3_access_key_id: settings.accessKeyId || null,
          s3_secret_access_key: settings.secretAccessKey || null,
          s3_force_path_style: settings.forcePathStyle,
          s3_uploads_enabled: settings.uploadsEnabled,
          s3_path_prefix: settings.pathPrefix || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.error) throw new Error(json.error?.message || "Save failed");
      toast.success("S3 settings saved");
      setSettings((s) => ({
        ...s,
        hasSecret: s.secretAccessKey ? true : s.hasSecret,
        pathPrefix: json.data?.s3_path_prefix || s.pathPrefix || "lcms-sequences/",
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const res = await fetch(`${API_URL}/api/functions/s3-test-connection`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify({
          settings: {
            provider: settings.provider,
            endpoint: settings.endpoint,
            region: settings.region,
            bucket: settings.bucket,
            accessKeyId: settings.accessKeyId,
            secretAccessKey: settings.secretAccessKey,
            forcePathStyle: settings.forcePathStyle,
            pathPrefix: settings.pathPrefix ? normalizedPrefix(settings.pathPrefix) : "",
          },
        }),
      });
      const json = await res.json();
      setTestResult(json);
      if (json.ok) {
        toast.success("Connection successful");
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

  if (!loaded) {
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
            Configure an external S3-compatible server (MinIO, Ceph, Wasabi, Backblaze, etc.) for
            optional LCMS sequence file uploads on bookings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-md border bg-muted/30 p-4 text-sm space-y-2">
            <p className="font-medium">Required settings (set below):</p>
            <ul className="list-disc pl-5 text-muted-foreground space-y-0.5">
              <li><code>Provider</code> — choose <code>Local</code> to store files on this server, or <code>S3</code> for an external bucket</li>
              <li><code>Endpoint</code> — e.g. <code>https://s3.mylab.example.com</code></li>
              <li><code>Region</code> — e.g. <code>us-east-1</code> (any string for most servers)</li>
              <li><code>Bucket</code> — bucket name</li>
              <li><code>Access Key ID</code></li>
              <li><code>Secret Access Key</code></li>
              <li><code>Force path style</code> — enable for MinIO/Ceph, disable for virtual-hosted style</li>
            </ul>
            <p className="text-muted-foreground pt-2">
              These credentials are saved in the application database and are used only by the
              server. They are never exposed to non-admin clients.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="provider">Storage provider</Label>
              <Select
                value={settings.provider}
                onValueChange={(v) => setSettings((s) => ({ ...s, provider: v as "local" | "s3" }))}
              >
                <SelectTrigger id="provider">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">Local server storage</SelectItem>
                  <SelectItem value="s3">S3-compatible server</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="region">Region</Label>
              <Input
                id="region"
                value={settings.region}
                onChange={(e) => setSettings((s) => ({ ...s, region: e.target.value }))}
                placeholder="us-east-1"
                disabled={settings.provider !== "s3"}
              />
            </div>
          </div>

          {settings.provider === "s3" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="endpoint">Endpoint URL</Label>
                <Input
                  id="endpoint"
                  value={settings.endpoint}
                  onChange={(e) => setSettings((s) => ({ ...s, endpoint: e.target.value }))}
                  placeholder="https://s3.mylab.example.com"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="accessKeyId">Access Key ID</Label>
                  <Input
                    id="accessKeyId"
                    value={settings.accessKeyId}
                    onChange={(e) => setSettings((s) => ({ ...s, accessKeyId: e.target.value }))}
                    placeholder="AKIA..."
                    autoComplete="off"
                  />
                </div>
                <div>
                  <Label htmlFor="secretAccessKey">Secret Access Key</Label>
                  <Input
                    id="secretAccessKey"
                    type="password"
                    value={settings.secretAccessKey}
                    onChange={(e) => setSettings((s) => ({ ...s, secretAccessKey: e.target.value }))}
                    placeholder={settings.hasSecret ? "•••••••• (saved)" : "••••••••"}
                    autoComplete="new-password"
                  />
                  {settings.hasSecret && !settings.secretAccessKey && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Leave blank to keep the saved secret; enter a new value to overwrite it.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="bucket">Bucket name</Label>
                <Input
                  id="bucket"
                  value={settings.bucket}
                  onChange={(e) => setSettings((s) => ({ ...s, bucket: e.target.value }))}
                  placeholder="lab-files"
                />
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  id="forcePathStyle"
                  checked={settings.forcePathStyle}
                  onCheckedChange={(v) => setSettings((s) => ({ ...s, forcePathStyle: v }))}
                />
                <div>
                  <Label htmlFor="forcePathStyle" className="block">Force path-style URLs</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable for MinIO/Ceph. Disable for AWS or virtual-hosted style.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="prefix">Storage path prefix</Label>
            <Input
              id="prefix"
              value={settings.pathPrefix}
              onChange={(e) => setSettings((s) => ({ ...s, pathPrefix: e.target.value }))}
              placeholder="lcms-sequences/"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Files will be stored under this prefix. A trailing slash will be added if missing.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-md border p-4">
            <div>
              <Label className="text-base">Enable sequence file uploads on bookings</Label>
              <p className="text-sm text-muted-foreground">
                When on, an optional upload field appears on every booking form.
              </p>
            </div>
            <Switch
              checked={settings.uploadsEnabled}
              onCheckedChange={(v) => setSettings((s) => ({ ...s, uploadsEnabled: v }))}
            />
          </div>

          {!testResult?.ok && settings.uploadsEnabled && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                You haven't successfully tested the connection yet. Uploads may fail until
                credentials are correct.
              </div>
            </div>
          )}

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
