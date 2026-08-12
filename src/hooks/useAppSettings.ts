import { useEffect, useState, useCallback } from "react";
import { supabase } from "../integrations/supabase/client";

export interface AppSettings {
  id: string;
  s3_uploads_enabled: boolean;
  s3_path_prefix: string;
  s3_endpoint_display: string | null;
  s3_bucket_display: string | null;
  max_booking_days_ahead: number;
  updated_at: string;
}

export const useAppSettings = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("app_settings")
      .select("*")
      .limit(1)
      .maybeSingle();
    if (!error && data) {
      setSettings(data as AppSettings);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { settings, isLoading, reload: load, setSettings };
};
