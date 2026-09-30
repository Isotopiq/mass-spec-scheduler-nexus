import { useState, useCallback } from "react";
import { BookingSwap } from "../types";

const API_URL = import.meta.env.VITE_API_URL || '';

function getHeaders(): HeadersInit {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('standalone_auth_token');
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function apiPost(path: string, body?: any) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: getHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok && json?.error?.message) throw new Error(json.error.message);
  if (!res.ok) throw new Error(res.statusText);
  return json;
}

async function apiGet(path: string) {
  const res = await fetch(`${API_URL}${path}`, { headers: getHeaders() });
  const json = await res.json().catch(() => ({}));
  if (!res.ok && json?.error?.message) throw new Error(json.error.message);
  if (!res.ok) throw new Error(res.statusText);
  return json;
}

function mapSwap(row: any): BookingSwap {
  return {
    id: row.id,
    requesterBookingId: row.requester_booking_id,
    recipientBookingId: row.recipient_booking_id,
    requesterUserId: row.requester_user_id,
    recipientUserId: row.recipient_user_id,
    status: row.status,
    adminNotes: row.admin_notes,
    requestedAt: row.requested_at,
    respondedAt: row.responded_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    requesterName: row.requester_name,
    requesterEmail: row.requester_email,
    recipientName: row.recipient_name,
    recipientEmail: row.recipient_email,
    requesterInstrumentName: row.requester_instrument_name,
    requesterPurpose: row.requester_purpose,
    requesterStart: row.requester_start,
    requesterEnd: row.requester_end,
    recipientInstrumentName: row.recipient_instrument_name,
    recipientPurpose: row.recipient_purpose,
    recipientStart: row.recipient_start,
    recipientEnd: row.recipient_end,
  };
}

export const useBookingSwaps = () => {
  const [isLoading, setIsLoading] = useState(false);

  const requestSwap = useCallback(async (requesterBookingId: string, recipientBookingId: string): Promise<BookingSwap> => {
    setIsLoading(true);
    try {
      const json = await apiPost('/api/booking-swaps', { requesterBookingId, recipientBookingId });
      return mapSwap(json.data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const respondToSwap = useCallback(async (swapId: string, response: 'accept' | 'decline' | 'cancel'): Promise<BookingSwap> => {
    setIsLoading(true);
    try {
      const json = await apiPost(`/api/booking-swaps/${swapId}/respond`, { response });
      return mapSwap(json.data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const adminReviewSwap = useCallback(async (swapId: string, status: string, adminNotes?: string): Promise<BookingSwap> => {
    setIsLoading(true);
    try {
      const json = await apiPost(`/api/booking-swaps/${swapId}/admin`, { status, adminNotes });
      return mapSwap(json.data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchSwaps = useCallback(async (status?: string): Promise<BookingSwap[]> => {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    const json = await apiGet(`/api/booking-swaps${query}`);
    return (json.data || []).map(mapSwap);
  }, []);

  const fetchEligibleSwaps = useCallback(async (bookingId: string): Promise<any[]> => {
    const json = await apiGet(`/api/booking-swaps/eligible?bookingId=${encodeURIComponent(bookingId)}`);
    return json.data || [];
  }, []);

  return {
    requestSwap,
    respondToSwap,
    adminReviewSwap,
    fetchSwaps,
    fetchEligibleSwaps,
    isLoading,
  };
};
