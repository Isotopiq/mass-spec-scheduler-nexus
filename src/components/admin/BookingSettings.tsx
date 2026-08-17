import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useAppSettings } from "../../hooks/useAppSettings";
import { supabase } from "../../integrations/supabase/client";
import { toast } from "sonner";

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

type Frequency = 'daily' | 'weekly';

const BookingSettings: React.FC = () => {
  const { settings, isLoading, reload } = useAppSettings();
  const [days, setDays] = useState(365);
  const [recurringEnabled, setRecurringEnabled] = useState(false);
  const [releaseEnabled, setReleaseEnabled] = useState(false);
  const [releaseWindowDays, setReleaseWindowDays] = useState(14);
  const [releaseTime, setReleaseTime] = useState("09:00");
  const [releaseFrequency, setReleaseFrequency] = useState<Frequency>('weekly');
  const [releaseDayOfWeek, setReleaseDayOfWeek] = useState(1);
  const [releaseTimezone, setReleaseTimezone] = useState("UTC");
  const [saving, setSaving] = useState(false);

  const timezones = useMemo(() => {
    try {
      if (typeof Intl !== "undefined" && "supportedValuesOf" in Intl) {
        return (Intl as any).supportedValuesOf("timeZone");
      }
    } catch { /* ignore */ }
    return [
      "UTC",
      "America/Los_Angeles",
      "America/New_York",
      "America/Chicago",
      "America/Denver",
      "Europe/London",
      "Europe/Paris",
      "Europe/Berlin",
      "Asia/Tokyo",
      "Asia/Shanghai",
      "Australia/Sydney",
      "Pacific/Auckland",
    ];
  }, []);

  useEffect(() => {
    if (settings) {
      setDays(settings.max_booking_days_ahead ?? 365);
      setRecurringEnabled(settings.recurring_bookings_enabled ?? false);
      setReleaseEnabled(settings.booking_release_enabled ?? false);
      setReleaseWindowDays(settings.booking_release_window_days ?? 14);
      setReleaseTime(String(settings.booking_release_time || "09:00").slice(0, 5));
      setReleaseTimezone(settings.booking_release_timezone || "UTC");
      if (settings.booking_release_day_of_week === null || settings.booking_release_day_of_week === undefined) {
        setReleaseFrequency('daily');
      } else {
        setReleaseFrequency('weekly');
        setReleaseDayOfWeek(settings.booking_release_day_of_week ?? 1);
      }
    }
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings?.id) return;
    setSaving(true);
    const values: Record<string, any> = {
      max_booking_days_ahead: days,
      recurring_bookings_enabled: recurringEnabled,
      booking_release_enabled: releaseEnabled,
      booking_release_window_days: releaseWindowDays,
      booking_release_time: releaseTime,
      booking_release_day_of_week: releaseFrequency === 'daily' ? null : releaseDayOfWeek,
      booking_release_timezone: releaseTimezone || "UTC",
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("app_settings")
      .update(values)
      .eq("id", settings.id);
    setSaving(false);
    if (error) {
      toast.error("Failed to update booking settings");
      return;
    }
    toast.success("Booking settings updated");
    reload();
    window.dispatchEvent(new CustomEvent('app-settings-updated'));
  };

  if (isLoading || !settings) {
    return <div className="p-6">Loading settings...</div>;
  }

  return (
    <Card className="p-6">
      <CardHeader>
        <CardTitle>Booking Horizon</CardTitle>
        <CardDescription>
          Restrict how far in advance users can schedule bookings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-6 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="maxBookingDays">Maximum days ahead</Label>
            <Input
              id="maxBookingDays"
              type="number"
              min={1}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              required
            />
            <p className="text-sm text-muted-foreground">
              Users will only be able to select dates up to {days} day{days === 1 ? "" : "s"} from today unless a release schedule is active.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="recurringBookings" className="block">Recurring bookings</Label>
              <p className="text-sm text-muted-foreground">
                Allow users to create weekly recurring bookings from the booking form.
              </p>
            </div>
            <Switch
              id="recurringBookings"
              checked={recurringEnabled}
              onCheckedChange={setRecurringEnabled}
            />
          </div>

          <div className="rounded-lg border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="releaseSchedule" className="block">Scheduled booking release</Label>
                <p className="text-sm text-muted-foreground">
                  Open a future booking window at a recurring day/time instead of a fixed rolling horizon.
                </p>
              </div>
              <Switch
                id="releaseSchedule"
                checked={releaseEnabled}
                onCheckedChange={setReleaseEnabled}
              />
            </div>

            {releaseEnabled && (
              <div className="space-y-4 pt-2 border-t">
                <div className="space-y-2">
                  <Label htmlFor="releaseWindowDays">Booking window (days)</Label>
                  <Input
                    id="releaseWindowDays"
                    type="number"
                    min={1}
                    value={releaseWindowDays}
                    onChange={(e) => setReleaseWindowDays(Number(e.target.value))}
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    How many days of bookings open at each release time (e.g., 14 for two weeks).
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="releaseFrequency">Release frequency</Label>
                  <Select value={releaseFrequency} onValueChange={(v) => setReleaseFrequency(v as Frequency)}>
                    <SelectTrigger id="releaseFrequency">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {releaseFrequency === 'weekly' && (
                  <div className="space-y-2">
                    <Label htmlFor="releaseDayOfWeek">Release day</Label>
                    <Select value={String(releaseDayOfWeek)} onValueChange={(v) => setReleaseDayOfWeek(Number(v))}>
                      <SelectTrigger id="releaseDayOfWeek">
                        <SelectValue placeholder="Select day" />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS.map((d, i) => (
                          <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="releaseTime">Release time</Label>
                  <Input
                    id="releaseTime"
                    type="time"
                    value={releaseTime}
                    onChange={(e) => setReleaseTime(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="releaseTimezone">Release timezone</Label>
                  <Select value={releaseTimezone} onValueChange={setReleaseTimezone}>
                    <SelectTrigger id="releaseTimezone">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto">
                      {timezones.map((tz) => (
                        <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    At this time in the selected timezone, the next {releaseWindowDays} day window becomes bookable.
                  </p>
                </div>
              </div>
            )}
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default BookingSettings;
