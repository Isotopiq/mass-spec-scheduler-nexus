import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Switch } from "../components/ui/switch";
import { Label } from "../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Separator } from "../components/ui/separator";
import { useToast } from "../hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Input } from "../components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../components/ui/input-otp";
import { useTheme } from "next-themes";
import { useAuth } from "../contexts/AuthContext";
import { UserSettings } from "../types";
import { Copy, Check, Calendar } from "lucide-react";

const defaultSettings: UserSettings = {
  emailNotifications: true,
  bookingReminders: true,
  darkMode: false,
  language: "en",
  timeZone: "UTC",
  calendarSync: false,
  autoLogout: 30,
  twoFactor: false,
};

const API_URL = import.meta.env.VITE_API_URL || '';

const SettingsPage: React.FC = () => {
  const { toast } = useToast();
  const { user, refreshCurrentUser } = useAuth();
  const { setTheme } = useTheme();

  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const [twoFADialogOpen, setTwoFADialogOpen] = useState(false);
  const [twoFAMode, setTwoFAMode] = useState<'setup' | 'disable' | null>(null);
  const [twoFAQr, setTwoFAQr] = useState<string | null>(null);
  const [twoFAOtpauthUrl, setTwoFAOtpauthUrl] = useState<string | null>(null);
  const [twoFAOtp, setTwoFAOtp] = useState("");

  useEffect(() => {
    const userSettings = user?.settings as UserSettings | undefined;
    if (userSettings) {
      setSettings(prev => ({ ...defaultSettings, ...userSettings }));
    }
  }, [user?.settings]);

  useEffect(() => {
    setTheme(settings.darkMode ? "dark" : "light");
  }, [settings.darkMode, setTheme]);

  useEffect(() => {
    document.documentElement.lang = settings.language || "en";
  }, [settings.language]);

  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const saveSettings = async (nextSettings: UserSettings) => {
    setLoading(true);
    setSettings(nextSettings);
    try {
      const res = await fetch(`${API_URL}/api/user/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('standalone_auth_token') || ''}`,
        },
        body: JSON.stringify({ settings: nextSettings }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.error) throw new Error(json.error?.message || 'Failed to save settings');
      await refreshCurrentUser();
      toast({ title: "Settings saved", description: "Your preferences have been updated." });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message || "Could not save settings.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => saveSettings(settings);

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Copy failed", description: "Could not copy to clipboard.", variant: "destructive" });
    }
  };

  const open2FASetup = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/auth/2fa/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('standalone_auth_token') || ''}`,
        },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.error) throw new Error(json.error?.message || 'Failed to start 2FA setup');
      setTwoFAQr(json.data.qrCodeDataUrl);
      setTwoFAOtpauthUrl(json.data.otpauthUrl);
      setTwoFAMode('setup');
      setTwoFADialogOpen(true);
      setTwoFAOtp("");
    } catch (e: any) {
      toast({ title: "2FA setup failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const enable2FA = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/auth/2fa/enable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('standalone_auth_token') || ''}`,
        },
        body: JSON.stringify({ code: twoFAOtp }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.error) throw new Error(json.error?.message || 'Invalid code');
      setTwoFADialogOpen(false);
      await saveSettings({ ...settings, twoFactor: true });
      toast({ title: "2FA enabled", description: "Two-factor authentication is now active." });
    } catch (e: any) {
      toast({ title: "Could not enable 2FA", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const disable2FA = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/auth/2fa/disable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('standalone_auth_token') || ''}`,
        },
        body: JSON.stringify({ code: twoFAOtp }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.error) throw new Error(json.error?.message || 'Invalid code');
      setTwoFADialogOpen(false);
      await saveSettings({ ...settings, twoFactor: false });
      toast({ title: "2FA disabled", description: "Two-factor authentication has been turned off." });
    } catch (e: any) {
      toast({ title: "Could not disable 2FA", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFactorToggle = (checked: boolean) => {
    if (checked) {
      if (!user?.twoFactorEnabled) open2FASetup();
    } else {
      if (user?.twoFactorEnabled) {
        setTwoFAMode('disable');
        setTwoFADialogOpen(true);
        setTwoFAOtp("");
      } else {
        updateSetting('twoFactor', false);
      }
    }
  };

  const closeTwoFADialog = () => {
    setTwoFADialogOpen(false);
    setTwoFAQr(null);
    setTwoFAOtpauthUrl(null);
    setTwoFAOtp("");
    setTwoFAMode(null);
  };

  const calendarSyncUrl = user?.settings?.calendarSyncUrl || settings.calendarSyncUrl;

  return (
    <div className="container py-6 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>

      <Dialog open={twoFADialogOpen} onOpenChange={setTwoFADialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {twoFAMode === 'setup' ? 'Set up two-factor authentication' : 'Disable two-factor authentication'}
            </DialogTitle>
            <DialogDescription>
              {twoFAMode === 'setup'
                ? 'Scan the QR code with your authenticator app, then enter the 6-digit code to confirm.'
                : 'Enter the 6-digit code from your authenticator app to turn off 2FA.'}
            </DialogDescription>
          </DialogHeader>

          {twoFAMode === 'setup' && twoFAQr && (
            <div className="flex flex-col items-center space-y-2">
              <img src={twoFAQr} alt="2FA QR code" className="h-48 w-48 rounded border" />
              {twoFAOtpauthUrl && (
                <p className="text-xs text-muted-foreground text-center break-all px-4">
                  Can’t scan? Use this key:<br />{twoFAOtpauthUrl}
                </p>
              )}
            </div>
          )}

          <div className="flex justify-center py-2">
            <InputOTP maxLength={6} value={twoFAOtp} onChange={(value) => setTwoFAOtp(value)}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={closeTwoFADialog} disabled={loading}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              type="button"
              disabled={loading || twoFAOtp.length !== 6}
              onClick={twoFAMode === 'setup' ? enable2FA : disable2FA}
            >
              {loading ? 'Verifying...' : twoFAMode === 'setup' ? 'Enable 2FA' : 'Disable 2FA'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="notifications">
        <TabsList>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Configure how you want to receive notifications. Email notifications are enabled by default.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email-notifications" className="font-medium">Email notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive emails about your bookings and instrument availability</p>
                </div>
                <Switch id="email-notifications" checked={settings.emailNotifications} onCheckedChange={(checked) => updateSetting('emailNotifications', checked)} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="booking-reminders" className="font-medium">Booking reminders</Label>
                  <p className="text-sm text-muted-foreground">Receive reminders before your scheduled bookings</p>
                </div>
                <Switch id="booking-reminders" checked={settings.bookingReminders} onCheckedChange={(checked) => updateSetting('bookingReminders', checked)} />
              </div>
              <Separator />
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize the look and feel of the application</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="dark-mode" className="font-medium">Dark mode</Label>
                  <p className="text-sm text-muted-foreground">Use dark theme for the application</p>
                </div>
                <Switch id="dark-mode" checked={settings.darkMode} onCheckedChange={(checked) => updateSetting('darkMode', checked)} />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="language" className="font-medium">Language</Label>
                <Select value={settings.language} onValueChange={(value) => updateSetting('language', value)}>
                  <SelectTrigger id="language"><SelectValue placeholder="Select language" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Calendar Settings</CardTitle>
              <CardDescription>Configure your calendar and sync settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="calendar-sync" className="font-medium">Calendar sync</Label>
                  <p className="text-sm text-muted-foreground">Sync your bookings with your calendar application</p>
                </div>
                <Switch id="calendar-sync" checked={settings.calendarSync} onCheckedChange={(checked) => updateSetting('calendarSync', checked)} />
              </div>

              {calendarSyncUrl && settings.calendarSync && (
                <div className="rounded-md border p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Calendar className="h-4 w-4" />
                    Calendar feed URL
                  </div>
                  <div className="flex items-center gap-2">
                    <Input value={calendarSyncUrl} readOnly className="text-sm" />
                    <Button size="icon" variant="outline" onClick={() => copyUrl(calendarSyncUrl)}>
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Paste this URL into Google Calendar, Outlook, or Apple Calendar.</p>
                </div>
              )}

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="timezone" className="font-medium">Time Zone</Label>
                <Select value={settings.timeZone} onValueChange={(value) => updateSetting('timeZone', value)}>
                  <SelectTrigger id="timezone"><SelectValue placeholder="Select time zone" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="America/New_York">Eastern Time</SelectItem>
                    <SelectItem value="America/Chicago">Central Time</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Configure your security preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="auto-logout" className="font-medium">Auto Logout (Minutes)</Label>
                <div className="flex items-center gap-4">
                  <Input id="auto-logout" type="number" min="5" max="120" value={settings.autoLogout} onChange={(e) => updateSetting('autoLogout', Number(e.target.value))} className="w-24" />
                  <span className="text-sm text-muted-foreground">Minutes of inactivity before automatic logout</span>
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="two-factor" className="font-medium">Two-factor authentication</Label>
                  <p className="text-sm text-muted-foreground">Add an additional layer of security to your account</p>
                </div>
                <Switch id="two-factor" checked={user?.twoFactorEnabled || settings.twoFactor} onCheckedChange={handleTwoFactorToggle} />
              </div>
              {user?.twoFactorEnabled && (
                <p className="text-sm text-emerald-600">Two-factor authentication is currently enabled.</p>
              )}
              <Separator />
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
