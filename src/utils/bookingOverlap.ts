import { Booking } from "../types";
import { format } from "date-fns";

/**
 * Returns the first booking that conflicts with the given time window on the
 * same instrument, or null if the slot is free.
 *
 * Overlap rule: existing.start < new.end AND existing.end > new.start
 * Back-to-back bookings (one ending exactly when another starts) are allowed.
 * Cancelled and denied bookings are ignored.
 */
export function findBookingConflict(params: {
  bookings: Booking[];
  instrumentId: string;
  start: Date;
  end: Date;
  excludeBookingId?: string;
}): Booking | null {
  const { bookings, instrumentId, start, end, excludeBookingId } = params;
  const startMs = start.getTime();
  const endMs = end.getTime();

  for (const b of bookings) {
    if (b.instrumentId !== instrumentId) continue;
    if (excludeBookingId && b.id === excludeBookingId) continue;
    const status = (b.status || "").toLowerCase();
    if (status === "cancelled" || status === "denied") continue;

    const existingStart = new Date(b.start).getTime();
    const existingEnd = new Date(b.end).getTime();
    if (existingStart < endMs && existingEnd > startMs) {
      return b;
    }
  }
  return null;
}

export function describeConflict(conflict: Booking): string {
  const start = format(new Date(conflict.start), "PPP 'at' p");
  const end = format(new Date(conflict.end), "p");
  return `This instrument is already booked by ${conflict.userName} from ${start} to ${end}.`;
}
