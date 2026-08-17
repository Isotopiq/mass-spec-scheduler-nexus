
import React, { useEffect, useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Mail, Save, TestTube } from "lucide-react";
import { useSmtpSettings } from "../../hooks/useSmtpSettings";
import { toast } from "sonner";

const SmtpSettings: React.FC = () => {
  const { smtpSettings, isLoading, loadSmtpSettings, saveSmtpSettings, sendTestEmail } = useSmtpSettings();
  const [formData, setFormData] = useState({
    host: "",
    port: 587,
    username: "",
    password: "",
    fromEmail: "",
    fromName: "Lab Management System",
    useTls: true
  });
  const [testEmail, setTestEmail] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadSmtpSettings();
  }, [loadSmtpSettings]);

  useEffect(() => {
    if (smtpSettings) {
      const newFormData = {
        host: smtpSettings.host || "",
        port: smtpSettings.port || 587,
        username: smtpSettings.username || "",
        password: smtpSettings.password || "",
        fromEmail: smtpSettings.fromEmail || "",
        fromName: smtpSettings.fromName || "Lab Management System",
        useTls: smtpSettings.useTls !== undefined ? smtpSettings.useTls : true
      };
      setFormData(newFormData);
      setHasChanges(false);
    }
  }, [smtpSettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.host || !formData.username || !formData.password || !formData.fromEmail) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setIsSaving(true);
      await saveSmtpSettings(formData);
      setHasChanges(false);
    } catch (error) {
      console.error("Error saving SMTP settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setHasChanges(true);
  };

  const handleSendTestEmail = async () => {
    if (!testEmail) {
      toast.error("Please enter a test email address");
      return;
    }

    if (hasChanges) {
      toast.error("Please save SMTP settings first before sending a test email");
      return;
    }

    if (!smtpSettings) {
      toast.error("Please save SMTP settings first");
      return;
    }
    
    try {
      setIsSendingTest(true);
      await sendTestEmail(testEmail);
    } catch (error) {
      console.error("Error sending test email:", error);
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">SMTP Email Settings</h3>
          <p className="text-sm text-muted-foreground">
            Configure your SMTP server settings for sending email notifications.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="host">SMTP Host *</Label>
              <Input
                id="host"
                value={formData.host}
                onChange={(e) => handleInputChange("host", e.target.value)}
                placeholder="smtp.gmail.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="port">SMTP Port *</Label>
              <Input
                id="port"
                type="number"
                value={formData.port}
                onChange={(e) => handleInputChange("port", parseInt(e.target.value) || 587)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => handleInputChange("username", e.target.value)}
                placeholder="your-email@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                placeholder="Your SMTP password or app password"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fromEmail">From Email *</Label>
              <Input
                id="fromEmail"
                type="email"
                value={formData.fromEmail}
                onChange={(e) => handleInputChange("fromEmail", e.target.value)}
                placeholder="noreply@yourdomain.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fromName">From Name *</Label>
              <Input
                id="fromName"
                value={formData.fromName}
                onChange={(e) => handleInputChange("fromName", e.target.value)}
                placeholder="Lab Management System"
                required
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="useTls"
              checked={formData.useTls}
              onCheckedChange={(checked) => handleInputChange("useTls", checked)}
            />
            <Label htmlFor="useTls">Use TLS/SSL encryption</Label>
          </div>

          <div className="flex gap-3 items-center">
            <Button 
              type="submit" 
              disabled={isLoading || isSaving || !hasChanges}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isSaving ? "Saving..." : "Save SMTP Settings"}
            </Button>
            
            {hasChanges && (
              <p className="text-sm text-amber-600 flex items-center">
                You have unsaved changes
              </p>
            )}
          </div>
        </form>

        <div className="border-t pt-6">
          <h4 className="text-md font-semibold mb-4 flex items-center gap-2">
            <TestTube className="w-4 h-4" />
            Test Email Configuration
          </h4>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="testEmail">Test Email Address</Label>
              <Input
                id="testEmail"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
              />
            </div>
            <Button 
              onClick={handleSendTestEmail}
              disabled={!testEmail || isSendingTest || !smtpSettings || hasChanges}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Mail className="w-4 h-4" />
              {isSendingTest ? "Sending..." : "Send Test Email"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Send a test email to verify your SMTP configuration is working correctly. 
            {hasChanges && " Please save your settings first."}
          </p>
        </div>
      </div>
    </Card>
  );
};

export default SmtpSettings;
