import React, { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { useAppSettings } from "../../hooks/useAppSettings";
import { supabase } from "../../integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload, Image as ImageIcon } from "lucide-react";

const DEFAULT_LOGO = "/lovable-uploads/40965317-613a-41b7-bc11-d9e8b6cba9ae.png";
const DEFAULT_FAVICON = "/lovable-uploads/c9351e76-a090-4113-bffa-7ee6800178c0.png";

const SiteAssetsSettings: React.FC = () => {
  const { settings, isLoading, reload } = useAppSettings();
  const [saving, setSaving] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const uploadAsset = async (file: File, key: "logo_url" | "favicon_url") => {
    if (!settings?.id) return;
    setSaving(key);
    try {
      const assetName = key === "logo_url" ? `logo-${Date.now()}.${file.name.split(".").pop()}` : `favicon-${Date.now()}.${file.name.split(".").pop()}`;
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from("site-assets")
        .upload(assetName, file, { upsert: true });

      if (uploadError) throw new Error(uploadError.message || "Upload failed");

      const { data: publicUrlData } = supabase
        .storage
        .from("site-assets")
        .getPublicUrl(assetName);

      const publicUrl = publicUrlData?.publicUrl;
      if (!publicUrl) throw new Error("Could not generate public URL");

      const { error: updateError } = await supabase
        .from("app_settings")
        .update({ [key]: publicUrl, updated_at: new Date().toISOString() })
        .eq("id", settings.id);

      if (updateError) throw new Error(updateError.message || "Failed to save asset URL");

      toast.success(`${key === "logo_url" ? "Logo" : "Favicon"} updated successfully`);
      reload();
      window.dispatchEvent(new CustomEvent('app-settings-updated'));
    } catch (err) {
      console.error("Asset upload error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to upload asset");
    } finally {
      setSaving(null);
    }
  };

  const handleFileChange = (key: "logo_url" | "favicon_url") => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    await uploadAsset(file, key);
  };

  if (isLoading || !settings) {
    return (
      <Card className="p-6">
        <CardHeader>
          <CardTitle>Site Assets</CardTitle>
        </CardHeader>
        <CardContent>Loading settings...</CardContent>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <CardHeader>
        <CardTitle>Site Assets</CardTitle>
        <CardDescription>
          Upload a custom logo and favicon for the application.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8 max-w-md">
        <div className="space-y-3">
          <Label>Logo</Label>
          <div className="border rounded-md p-4 flex items-center justify-center bg-muted">
            <img
              src={settings.logo_url || DEFAULT_LOGO}
              alt="Site logo"
              className="max-h-16 object-contain"
            />
          </div>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange("logo_url")}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => logoInputRef.current?.click()}
            disabled={!!saving}
            className="w-full"
          >
            {saving === "logo_url" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Upload Logo
          </Button>
        </div>

        <div className="space-y-3">
          <Label>Favicon</Label>
          <div className="border rounded-md p-4 flex items-center justify-center bg-muted">
            <img
              src={settings.favicon_url || DEFAULT_FAVICON}
              alt="Favicon"
              className="h-8 w-8 object-contain"
            />
          </div>
          <input
            ref={faviconInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange("favicon_url")}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => faviconInputRef.current?.click()}
            disabled={!!saving}
            className="w-full"
          >
            {saving === "favicon_url" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ImageIcon className="mr-2 h-4 w-4" />
            )}
            Upload Favicon
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SiteAssetsSettings;
