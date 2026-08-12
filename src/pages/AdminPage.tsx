
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
        <TabsList className="grid grid-cols-10 w-full max-w-7xl">
          <TabsTrigger value="pending-bookings" className="px-2 py-2 text-sm">Pending</TabsTrigger>
          <TabsTrigger value="booking-history" className="px-2 py-2 text-sm">History</TabsTrigger>
          <TabsTrigger value="users" className="px-2 py-2 text-sm">Users</TabsTrigger>
          <TabsTrigger value="instruments" className="px-2 py-2 text-sm">Instruments</TabsTrigger>
          <TabsTrigger value="delays" className="px-2 py-2 text-sm">Delays</TabsTrigger>
          <TabsTrigger value="status-colors" className="px-2 py-2 text-sm">Colors</TabsTrigger>
          <TabsTrigger value="smtp" className="px-2 py-2 text-sm">SMTP</TabsTrigger>
          <TabsTrigger value="email-templates" className="px-2 py-2 text-sm">Templates</TabsTrigger>
          <TabsTrigger value="storage" className="px-2 py-2 text-sm">Storage</TabsTrigger>
          <TabsTrigger value="booking-settings" className="px-2 py-2 text-sm">Booking</TabsTrigger>
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
      </Tabs>
    </div>
  );
};

export default AdminPage;
