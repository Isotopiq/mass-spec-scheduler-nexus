import { useEffect, useState, useCallback } from "react";
import { supabase } from "../integrations/supabase/client";

const API_URL = import.meta.env.VITE_API_URL || '';

export interface AppSettings {
  id: string;
  s3_uploads_enabled: boolean;
  s3_path_prefix: string;
  s3_endpoint_display: string | null;
  s3_bucket_display: string | null;
  max_booking_days_ahead: number;
  recurring_bookings_enabled: boolean;
  email_template_style: string;
  logo_url: string | null;
  favicon_url: string | null;
  site_name: string | null;
  updated_at: string;
}

export const useAppSettings = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/app-settings`);
      const json = await res.json().catch(() => ({}));
      if (!json.error && json.data) {
        setSettings(json.data as AppSettings);
      } else {
        // Fallback to authenticated generic endpoint
        const { data, error } = await supabase
          .from("app_settings")
          .select("*")
          .limit(1)
          .maybeSingle();
        if (!error && data) {
          setSettings(data as AppSettings);
        }
      }
    } catch (err) {
      console.error('Error loading app settings:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const handleUpdate = () => load();
    window.addEventListener('app-settings-updated', handleUpdate);
    return () => window.removeEventListener('app-settings-updated', handleUpdate);
  }, [load]);

  return { settings, isLoading, reload: load, setSettings };
};
