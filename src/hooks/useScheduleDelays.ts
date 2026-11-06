import { useState, useCallback } from "react";
import { supabase } from "../integrations/supabase/client";
import { Booking } from "../types";

export interface ScheduleDelay {
  id: string;
  cutoffTime: string;
  delayMinutes: number;
  instrumentId: string | null;
  reason: string;
  appliedByName: string | null;
  affectedCount: number;
  status: "applied" | "reversed";
  reversedAt: string | null;
  createdAt: string;
}

export interface DelayResult {
  affected: number;
  skipped: number;
  restored?: number;
}

const API_URL = import.meta.env.VITE_API_URL || '';

const mapDelay = (row: any): ScheduleDelay => ({
  id: row.id,
  cutoffTime: row.cutoff_time,
  delayMinutes: row.delay_minutes,
  instrumentId: row.instrument_id,
  reason: row.reason || "",
  appliedByName: row.applied_by_name,
  affectedCount: row.affected_count,
  status: row.status === "reversed" ? "reversed" : "applied",
  reversedAt: row.reversed_at,
  createdAt: row.created_at,
});

export const useScheduleDelays = () => {
  const [delays, setDelays] = useState<ScheduleDelay[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadDelays = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const { data, error } = await supabase
        .from("schedule_delays")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      setDelays((data || []).map(mapDelay));
    } catch (error) {
      console.error("useScheduleDelays: failed to load delays", error);
      setLoadError(error instanceof Error ? error.message : "Unable to load delay history.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const applyDelay = useCallback(
    async (params: {
      bookings?: Booking[];
      delayMinutes: number;
      cutoff: Date;
      instrumentId?: string | null;
      reason: string;
      appliedBy?: string | null;
      appliedByName?: string | null;
    }): Promise<DelayResult> => {
      setIsWorking(true);
      try {
        const token = localStorage.getItem('standalone_auth_token');
        const res = await fetch(`${API_URL}/api/schedule-delays`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token || ''}`,
          },
          body: JSON.stringify({
            delayMinutes: params.delayMinutes,
            cutoff: params.cutoff.toISOString(),
            instrumentId: params.instrumentId || null,
            reason: params.reason,
            appliedBy: params.appliedBy,
            appliedByName: params.appliedByName,
          }),
        });
        const json = await res.json();
        if (!res.ok || json.error) throw new Error(json.error?.message || 'Apply delay failed');
        await loadDelays();
        return json.data || { affected: 0, skipped: 0 };
      } finally {
        setIsWorking(false);
      }
    },
    [loadDelays]
  );

  const reverseDelay = useCallback(
    async (delayId: string): Promise<DelayResult> => {
      setIsWorking(true);
      try {
        const token = localStorage.getItem('standalone_auth_token');
        const res = await fetch(`${API_URL}/api/schedule-delays/${encodeURIComponent(delayId)}/reverse`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token || ''}`,
          },
        });
        const json = await res.json();
        if (!res.ok || json.error) throw new Error(json.error?.message || 'Reverse delay failed');
        await loadDelays();
        return json.data || { affected: 0, restored: 0, skipped: 0 };
      } finally {
        setIsWorking(false);
      }
    },
    [loadDelays]
  );

  return { delays, isLoading, isWorking, loadError, loadDelays, applyDelay, reverseDelay };
};
