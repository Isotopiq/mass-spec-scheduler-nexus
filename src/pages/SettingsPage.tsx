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

// Define interface for settings
interface UserSettings {
  emailNotifications: boolean;
  bookingReminders: boolean;
  darkMode: boolean;
  language: string;
  timeZone: string;
  calendarSync: boolean;
  autoLogout: number;
  twoFactor: boolean;
}

const SettingsPage: React.FC = () => {
  const { toast } = useToast();
  
  // Initialize settings from localStorage or default values (with email notifications enabled by default)
  const [settings, setSettings] = useState<UserSettings>(() => {
    const savedSettings = localStorage.getItem('mslab_user_settings');
    return savedSettings ? JSON.parse(savedSettings) : {
      emailNotifications: true, // Default to enabled
      bookingReminders: true,   // Default to enabled
      darkMode: false,
      language: "en",
      timeZone: "UTC",
      calendarSync: false,
      autoLogout: 30,
      twoFactor: false
    };
  });
  
  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('mslab_user_settings', JSON.stringify(settings));
  }, [settings]);

  const handleSave = () => {
    localStorage.setItem('mslab_user_settings', JSON.stringify(settings));
    toast({
      title: "Settings saved",
      description: "Your preferences have been updated.",
    });
  };

  return (
    <div className="container py-6 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      
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
                  <Label htmlFor="email-notifications" className="font-medium">
                    Email notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive emails about your bookings and instrument availability
                  </p>
                </div>
                <Switch 
                  id="email-notifications" 
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => setSettings(prev => ({...prev, emailNotifications: checked}))}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="booking-reminders" className="font-medium">
                    Booking reminders
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive reminders before your scheduled bookings
                  </p>
                </div>
                <Switch 
                  id="booking-reminders" 
                  checked={settings.bookingReminders}
                  onCheckedChange={(checked) => setSettings(prev => ({...prev, bookingReminders: checked}))}
                />
              </div>
              
              <Separator />
              
              <div className="flex justify-end">
                <Button onClick={handleSave}>Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="appearance" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Customize the look and feel of the application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="dark-mode" className="font-medium">
                    Dark mode
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Use dark theme for the application
                  </p>
                </div>
                <Switch 
                  id="dark-mode" 
                  checked={settings.darkMode}
                  onCheckedChange={(checked) => setSettings(prev => ({...prev, darkMode: checked}))}
                />
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Label htmlFor="language" className="font-medium">
                  Language
                </Label>
                <Select 
                  value={settings.language} 
                  onValueChange={(value) => setSettings(prev => ({...prev, language: value}))}
                >
                  <SelectTrigger id="language">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
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
                <Button onClick={handleSave}>Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="calendar" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Calendar Settings</CardTitle>
              <CardDescription>
                Configure your calendar and sync settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="calendar-sync" className="font-medium">
                    Calendar sync
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Sync your bookings with your calendar application
                  </p>
                </div>
                <Switch 
                  id="calendar-sync" 
                  checked={settings.calendarSync}
                  onCheckedChange={(checked) => setSettings(prev => ({...prev, calendarSync: checked}))}
                />
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Label htmlFor="timezone" className="font-medium">
                  Time Zone
                </Label>
                <Select 
                  value={settings.timeZone} 
                  onValueChange={(value) => setSettings(prev => ({...prev, timeZone: value}))}
                >
                  <SelectTrigger id="timezone">
                    <SelectValue placeholder="Select time zone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="EST">Eastern Time (EST)</SelectItem>
                    <SelectItem value="CST">Central Time (CST)</SelectItem>
                    <SelectItem value="MST">Mountain Time (MST)</SelectItem>
                    <SelectItem value="PST">Pacific Time (PST)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Separator />
              
              <div className="flex justify-end">
                <Button onClick={handleSave}>Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="security" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Configure your security preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="auto-logout" className="font-medium">
                  Auto Logout (Minutes)
                </Label>
                <div className="flex items-center gap-4">
                  <Input 
                    id="auto-logout" 
                    type="number" 
                    min="5" 
                    max="120" 
                    value={settings.autoLogout}
                    onChange={(e) => setSettings(prev => ({...prev, autoLogout: Number(e.target.value)}))}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">
                    Minutes of inactivity before automatic logout
                  </span>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="two-factor" className="font-medium">
                    Two-factor authentication
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Add an additional layer of security to your account
                  </p>
                </div>
                <Switch 
                  id="two-factor"
                  checked={settings.twoFactor}
                  onCheckedChange={(checked) => setSettings(prev => ({...prev, twoFactor: checked}))}
                />
              </div>
              
              <Separator />
              
              <div className="flex justify-end">
                <Button onClick={handleSave}>Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
