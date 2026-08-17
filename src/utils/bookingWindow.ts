import { AppSettings } from "../hooks/useAppSettings";

export interface ReleaseSettings {
  booking_release_enabled?: boolean;
  booking_release_window_days?: number;
  booking_release_time?: string;
  booking_release_day_of_week?: number | null;
  booking_release_timezone?: string | null;
  max_booking_days_ahead?: number;
}

function parseTime(timeValue?: string | null) {
  if (!timeValue) return { hours: 9, minutes: 0 };
  const m = String(timeValue).match(/^(\d{1,2}):(\d{2})(?::\d{2})?/);
  if (!m) return { hours: 9, minutes: 0 };
  return { hours: Number(m[1]), minutes: Number(m[2]) };
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();
const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function getZonedParts(date: Date, timeZone?: string | null) {
  const tz = timeZone || "UTC";
  let formatter = formatterCache.get(tz);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      weekday: "short",
      hourCycle: "h23",
    });
    formatterCache.set(tz, formatter);
  }
  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    second: Number(get("second")),
    weekday: dayMap[get("weekday") || ""] ?? 0,
  };
}

function getUtcForParts(
  parts: { year: number; month: number; day: number; hour: number; minute: number; second?: number },
  timeZone?: string | null
) {
  const tz = timeZone || "UTC";
  let utc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second || 0);
  for (let i = 0; i < 12; i++) {
    const local = getZonedParts(new Date(utc), tz);
    const diff =
      Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second || 0) -
      Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second || 0);
    if (Math.abs(diff) < 1000) break;
    utc += diff;
  }
  return new Date(utc);
}

function getPreviousReleaseTime(
  now: Date,
  dayOfWeek: number | null | undefined,
  timeValue?: string | null,
  timeZone?: string | null
) {
  const { hours, minutes } = parseTime(timeValue);
  const localNow = getZonedParts(now, timeZone);
  const parts = { ...localNow, hour: hours, minute: minutes, second: 0 };
  if (typeof dayOfWeek === "number" && !Number.isNaN(dayOfWeek)) {
    const diff = (parts.weekday - dayOfWeek + 7) % 7;
    parts.day -= diff;
    parts.weekday = dayOfWeek;
  }
  let candidate = getUtcForParts(parts, timeZone);
  if (candidate > now) {
    if (typeof dayOfWeek === "number" && !Number.isNaN(dayOfWeek)) {
      parts.day -= 7;
    } else {
      parts.day -= 1;
    }
    candidate = getUtcForParts(parts, timeZone);
  }
  return candidate;
}

export function getBookingWindowEnd(
  settings: ReleaseSettings | AppSettings | null | undefined,
  now: Date = new Date()
): Date | null {
  if (!settings) return null;

  const releaseEnabled = settings.booking_release_enabled;
  const windowDays = settings.booking_release_window_days || 0;
  if (releaseEnabled && windowDays > 0) {
    const lastRelease = getPreviousReleaseTime(
      now,
      settings.booking_release_day_of_week,
      settings.booking_release_time,
      settings.booking_release_timezone
    );
    const endParts = getZonedParts(lastRelease, settings.booking_release_timezone);
    endParts.day += Number(windowDays);
    endParts.hour = 23;
    endParts.minute = 59;
    endParts.second = 59;
    return getUtcForParts(endParts, settings.booking_release_timezone);
  }

  const maxDays = settings.max_booking_days_ahead ?? 0;
  if (maxDays > 0) {
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + maxDays, 23, 59, 59, 999);
    return end;
  }
  return null;
}

export function formatReleaseDay(day: number | null | undefined): string {
  if (day === null || day === undefined) return "Daily";
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[day] ?? "Daily";
}
