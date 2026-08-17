import { AppSettings } from "../hooks/useAppSettings";

export interface ReleaseSettings {
  booking_release_enabled?: boolean;
  booking_release_window_days?: number;
  booking_release_time?: string;
  booking_release_day_of_week?: number | null;
  max_booking_days_ahead?: number;
}

function parseTime(timeValue?: string | null) {
  if (!timeValue) return { hours: 9, minutes: 0 };
  const m = String(timeValue).match(/^(\d{1,2}):(\d{2})(?::\d{2})?/);
  if (!m) return { hours: 9, minutes: 0 };
  return { hours: Number(m[1]), minutes: Number(m[2]) };
}

function getPreviousReleaseTime(now: Date, dayOfWeek: number | null | undefined, timeValue?: string | null) {
  const { hours, minutes } = parseTime(timeValue);
  const candidate = new Date(now);
  candidate.setSeconds(0, 0);
  candidate.setMinutes(minutes);
  candidate.setHours(hours);

  if (typeof dayOfWeek === 'number' && !Number.isNaN(dayOfWeek)) {
    const currentDay = candidate.getDay();
    const diff = (currentDay - dayOfWeek + 7) % 7;
    candidate.setDate(candidate.getDate() - diff);
  }

  if (candidate > now) {
    if (typeof dayOfWeek === 'number' && !Number.isNaN(dayOfWeek)) {
      candidate.setDate(candidate.getDate() - 7);
    } else {
      candidate.setDate(candidate.getDate() - 1);
    }
  }
  return candidate;
}

export function getBookingWindowEnd(
  settings: ReleaseSettings | AppSettings | null | undefined,
  now: Date = new Date()
): Date | null {
  if (!settings) return null;

  if (settings.booking_release_enabled && (settings.booking_release_window_days || 0) > 0) {
    const lastRelease = getPreviousReleaseTime(
      now,
      settings.booking_release_day_of_week,
      settings.booking_release_time
    );
    const end = new Date(lastRelease);
    end.setDate(end.getDate() + Number(settings.booking_release_window_days));
    end.setHours(23, 59, 59, 999);
    return end;
  }

  const maxDays = settings.max_booking_days_ahead ?? 0;
  if (maxDays > 0) {
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + maxDays, 23, 59, 59, 999);
    return end;
  }
  return null;
}

export function formatReleaseDay(day: number | null | undefined): string {
  if (day === null || day === undefined) return 'Daily';
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[day] ?? 'Daily';
}
