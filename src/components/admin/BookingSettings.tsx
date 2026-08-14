import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { useAppSettings } from "../../hooks/useAppSettings";
import { supabase } from "../../integrations/supabase/client";
import { toast } from "sonner";

const BookingSettings: React.FC = () => {
  const { settings, isLoading, reload } = useAppSettings();
  const [days, setDays] = useState(365);
  const [recurringEnabled, setRecurringEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setDays(settings.max_booking_days_ahead ?? 365);
      setRecurringEnabled(settings.recurring_bookings_enabled ?? false);
    }
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings?.id) return;
    setSaving(true);
    const { error } = await supabase
      .from("app_settings")
      .update({ max_booking_days_ahead: days, recurring_bookings_enabled: recurringEnabled, updated_at: new Date().toISOString() })
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
              Users will only be able to select dates up to {days} day{days === 1 ? "" : "s"} from today.
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

          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default BookingSettings;
