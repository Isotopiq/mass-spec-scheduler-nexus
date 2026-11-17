import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export interface WaitlistEntry {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  instrumentId: string;
  instrumentName?: string;
  startTime: string;
  endTime: string;
  purpose?: string;
  details?: string;
  status: 'waiting' | 'filled' | 'cancelled' | 'expired';
  filledBookingId?: string | null;
  filledStart?: string | null;
  filledEnd?: string | null;
  createdAt: string;
}

export function useWaitlist() {
  const { user, session } = useAuth();
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = useCallback(async (status?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      const res = await fetch(`/api/waitlist?${params.toString()}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error?.message || 'Failed to load waitlist');
      const mapped: WaitlistEntry[] = (json.data || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        userName: row.user_name,
        userEmail: row.user_email,
        instrumentId: row.instrument_id,
        instrumentName: row.instrument_name,
        startTime: row.start_time,
        endTime: row.end_time,
        purpose: row.purpose,
        details: row.details,
        status: row.status,
        filledBookingId: row.filled_booking_id,
        filledStart: row.filled_start,
        filledEnd: row.filled_end,
        createdAt: row.created_at
      }));
      setEntries(mapped);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  const cancelEntry = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/waitlist/${id}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error?.message || 'Failed to cancel');
      setEntries(prev => prev.map(e => e.id === id ? { ...e, status: 'cancelled' } : e));
      return json.data;
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  }, [session]);

  useEffect(() => {
    if (user) fetchEntries();
  }, [user, fetchEntries]);

  return { entries, isLoading, error, fetchEntries, cancelEntry };
}
