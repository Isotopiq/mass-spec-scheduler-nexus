
import React, { useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useAuth } from "../contexts/AuthContext";
import { useOptimizedBooking } from "../contexts/OptimizedBookingContext";
import UserManagement from "../components/admin/UserManagement";
import InstrumentManagement from "../components/admin/InstrumentManagement";
import DelaySchedule from "../components/admin/DelaySchedule";
import StatusColorManagement from "../components/admin/StatusColorManagement";
import SmtpSettings from "../components/admin/SmtpSettings";
import EmailTemplatesManagement from "../components/admin/EmailTemplatesManagement";
import PendingBookingsManagement from "../components/admin/PendingBookingsManagement";
import BookingHistoryManagement from "../components/admin/BookingHistoryManagement";
import S3SettingsManagement from "../components/admin/S3SettingsManagement";
import BookingSettings from "../components/admin/BookingSettings";
import SiteAssetsSettings from "../components/admin/SiteAssetsSettings";
import { SwapRequestsManagement } from "../components/admin/SwapRequestsManagement";
import { WaitlistPanel } from "../components/bookings/WaitlistPanel";
import { QuotaManagement } from "../components/admin/QuotaManagement";
import { MaintenanceCalendarManagement } from "../components/admin/MaintenanceCalendarManagement";
import { BulkImportExport } from "../components/admin/BulkImportExport";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

const AdminPage: React.FC = () => {
  const { user } = useAuth();
  const { isLoading } = useOptimizedBooking();
  const [activeTab, setActiveTab] = useState("pending-bookings");

  const handleTabChange = useCallback((value: string) => {
    console.log(`AdminPage: Switching to tab: ${value}`);
    setActiveTab(value);
  }, []);

  // Redirect if user is not admin
  if (!user || user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Administration</h1>
      </div>
      
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading admin data...</span>
        </div>
      )}
      
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 h-auto p-1 gap-1">
          <TabsTrigger value="pending-bookings" className="px-1 py-2 text-xs md:text-sm text-center whitespace-nowrap overflow-hidden text-ellipsis" onClick={() => setActiveTab("pending-bookings")}>Pending</TabsTrigger>
          <TabsTrigger value="booking-history" className="px-1 py-2 text-xs md:text-sm text-center whitespace-nowrap overflow-hidden text-ellipsis" onClick={() => setActiveTab("booking-history")}>History</TabsTrigger>
          <TabsTrigger value="users" className="px-1 py-2 text-xs md:text-sm text-center whitespace-nowrap overflow-hidden text-ellipsis" onClick={() => setActiveTab("users")}>Users</TabsTrigger>
          <TabsTrigger value="instruments" className="px-1 py-2 text-xs md:text-sm text-center whitespace-nowrap overflow-hidden text-ellipsis" onClick={() => setActiveTab("instruments")}>Instruments</TabsTrigger>
          <TabsTrigger value="delays" className="px-1 py-2 text-xs md:text-sm text-center whitespace-nowrap overflow-hidden text-ellipsis" onClick={() => setActiveTab("delays")}>Delays</TabsTrigger>
          <TabsTrigger value="status-colors" className="px-1 py-2 text-xs md:text-sm text-center whitespace-nowrap overflow-hidden text-ellipsis" onClick={() => setActiveTab("status-colors")}>Colors</TabsTrigger>
          <TabsTrigger value="smtp" className="px-1 py-2 text-xs md:text-sm text-center whitespace-nowrap overflow-hidden text-ellipsis" onClick={() => setActiveTab("smtp")}>SMTP</TabsTrigger>
          <TabsTrigger value="email-templates" className="px-1 py-2 text-xs md:text-sm text-center whitespace-nowrap overflow-hidden text-ellipsis" onClick={() => setActiveTab("email-templates")}>Templates</TabsTrigger>
          <TabsTrigger value="storage" className="px-1 py-2 text-xs md:text-sm text-center whitespace-nowrap overflow-hidden text-ellipsis" onClick={() => setActiveTab("storage")}>Storage</TabsTrigger>
          <TabsTrigger value="booking-settings" className="px-1 py-2 text-xs md:text-sm text-center whitespace-nowrap overflow-hidden text-ellipsis" onClick={() => setActiveTab("booking-settings")}>Booking</TabsTrigger>
          <TabsTrigger value="swap-requests" className="px-1 py-2 text-xs md:text-sm text-center whitespace-nowrap overflow-hidden text-ellipsis" onClick={() => setActiveTab("swap-requests")}>Swaps</TabsTrigger>
          <TabsTrigger value="waitlist" className="px-1 py-2 text-xs md:text-sm text-center whitespace-nowrap overflow-hidden text-ellipsis" onClick={() => setActiveTab("waitlist")}>Waitlist</TabsTrigger>
          <TabsTrigger value="quotas" className="px-1 py-2 text-xs md:text-sm text-center whitespace-nowrap overflow-hidden text-ellipsis" onClick={() => setActiveTab("quotas")}>Quotas</TabsTrigger>
          <TabsTrigger value="maintenance" className="px-1 py-2 text-xs md:text-sm text-center whitespace-nowrap overflow-hidden text-ellipsis" onClick={() => setActiveTab("maintenance")}>Maintenance</TabsTrigger>
          <TabsTrigger value="bulk" className="px-1 py-2 text-xs md:text-sm text-center whitespace-nowrap overflow-hidden text-ellipsis" onClick={() => setActiveTab("bulk")}>Import / Export</TabsTrigger>
          <TabsTrigger value="site-assets" className="px-1 py-2 text-xs md:text-sm text-center whitespace-nowrap overflow-hidden text-ellipsis" onClick={() => setActiveTab("site-assets")}>Branding</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending-bookings" className="mt-6">
          {activeTab === "pending-bookings" && <PendingBookingsManagement />}
        </TabsContent>
        
        <TabsContent value="booking-history" className="mt-6">
          {activeTab === "booking-history" && <BookingHistoryManagement />}
        </TabsContent>
        
        <TabsContent value="users" className="mt-6">
          {activeTab === "users" && <UserManagement />}
        </TabsContent>
        
        <TabsContent value="instruments" className="mt-6">
          {activeTab === "instruments" && <InstrumentManagement />}
        </TabsContent>
        
        <TabsContent value="delays" className="mt-6">
          {activeTab === "delays" && <DelaySchedule />}
        </TabsContent>
        
        <TabsContent value="status-colors" className="mt-6">
          {activeTab === "status-colors" && <StatusColorManagement />}
        </TabsContent>
        
        <TabsContent value="smtp" className="mt-6">
          {activeTab === "smtp" && <SmtpSettings />}
        </TabsContent>
        
        <TabsContent value="email-templates" className="mt-6">
          {activeTab === "email-templates" && <EmailTemplatesManagement />}
        </TabsContent>

        <TabsContent value="storage" className="mt-6">
          {activeTab === "storage" && <S3SettingsManagement />}
        </TabsContent>

        <TabsContent value="booking-settings" className="mt-6">
          {activeTab === "booking-settings" && <BookingSettings />}
        </TabsContent>

        <TabsContent value="swap-requests" className="mt-6">
          {activeTab === "swap-requests" && <SwapRequestsManagement />}
        </TabsContent>

        <TabsContent value="waitlist" className="mt-6">
          {activeTab === "waitlist" && <WaitlistPanel admin />}
        </TabsContent>

        <TabsContent value="quotas" className="mt-6">
          {activeTab === "quotas" && <QuotaManagement />}
        </TabsContent>

        <TabsContent value="maintenance" className="mt-6">
          {activeTab === "maintenance" && <MaintenanceCalendarManagement />}
        </TabsContent>

        <TabsContent value="bulk" className="mt-6">
          {activeTab === "bulk" && <BulkImportExport />}
        </TabsContent>

        <TabsContent value="site-assets" className="mt-6">
          {activeTab === "site-assets" && <SiteAssetsSettings />}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPage;
