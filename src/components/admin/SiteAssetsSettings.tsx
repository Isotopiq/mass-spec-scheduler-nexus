import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { useAppSettings } from "../../hooks/useAppSettings";
import { supabase } from "../../integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload, Image as ImageIcon } from "lucide-react";
import { ImageCropDialog } from "@/components/ui/ImageCropDialog";
import { SiteLogo } from "@/components/SiteLogo";

const DEFAULT_LOGO = "/site-assets/40965317-613a-41b7-bc11-d9e8b6cba9ae.png";
const DEFAULT_FAVICON = "/site-assets/c9351e76-a090-4113-bffa-7ee6800178c0.png";
const DEFAULT_SITE_TITLE = "TeSlaa Lab MS Scheduling Suite";

const SiteAssetsSettings: React.FC = () => {
  const { settings, isLoading, reload } = useAppSettings();
  const [siteName, setSiteName] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropMime, setCropMime] = useState<string>("");
  const [cropKey, setCropKey] = useState<"logo_url" | "favicon_url" | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSiteName(settings?.site_name || DEFAULT_SITE_TITLE);
  }, [settings?.site_name]);

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

  const handleFileChange = (key: "logo_url" | "favicon_url") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setCropSrc(event.target?.result as string);
      setCropMime(file.type);
      setCropKey(key);
      setCropOpen(true);
    };
    reader.readAsDataURL(file);

    e.target.value = "";
  };

  const handleCroppedAsset = async (file: File) => {
    if (!cropKey) return;
    setCropOpen(false);
    await uploadAsset(file, cropKey);
  };

  const saveSiteName = async () => {
    if (!settings?.id) return;
    setSaving("site_name");
    try {
      const value = siteName.trim() || DEFAULT_SITE_TITLE;
      const { error } = await supabase
        .from("app_settings")
        .update({ site_name: value === DEFAULT_SITE_TITLE ? null : value, updated_at: new Date().toISOString() })
        .eq("id", settings.id);
      if (error) throw new Error(error.message || "Failed to save site name");
      toast.success("Site name updated");
      reload();
      window.dispatchEvent(new CustomEvent('app-settings-updated'));
    } catch (err) {
      console.error("Site name save error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to save site name");
    } finally {
      setSaving(null);
    }
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
          Upload a custom logo and favicon, and set the browser tab title.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8 max-w-md">
        <div className="space-y-3">
          <Label htmlFor="site-name">Site Name / Browser Tab Title</Label>
          <Input
            id="site-name"
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            placeholder={DEFAULT_SITE_TITLE}
            disabled={!!saving}
          />
          <Button
            type="button"
            onClick={saveSiteName}
            disabled={!!saving}
            className="w-full"
          >
            {saving === "site_name" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Save Site Name
          </Button>
        </div>

        <div className="space-y-3">
          <Label>Logo</Label>
          <div className="border rounded-md p-4 flex items-center justify-center bg-muted">
            <SiteLogo
              src={settings.logo_url}
              alt="Site logo"
              className="max-h-16 object-contain"
              fallbackClassName="h-16 w-16"
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
            <SiteLogo
              src={settings.favicon_url}
              alt="Favicon"
              className="h-8 w-8 object-contain"
              fallbackSrc={DEFAULT_FAVICON}
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

      <ImageCropDialog
        open={cropOpen}
        onOpenChange={setCropOpen}
        imageSrc={cropSrc}
        title={`Crop ${cropKey === "favicon_url" ? "favicon" : "logo"}`}
        aspect={cropKey === "favicon_url" ? 1 : 16 / 9}
        cropShape="rect"
        mimeType={cropMime || undefined}
        onCropped={handleCroppedAsset}
      />
    </Card>
  );
};

export default SiteAssetsSettings;
