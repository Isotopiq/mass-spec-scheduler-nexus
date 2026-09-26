
import React from "react";
import { useAppSettings } from "../../hooks/useAppSettings";
import { SiteLogo } from "../SiteLogo";

const Footer: React.FC = () => {
  const { settings } = useAppSettings();
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="border-t py-6 bg-background mt-auto">
      <div className="container flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <SiteLogo src={settings?.logo_url} alt="MSLab Logo" className="h-5 w-auto max-w-[120px] object-contain" />
          <span>MSLab Scheduler</span>
        </div>
        <p>&copy; {currentYear} MSLab Scheduler. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
