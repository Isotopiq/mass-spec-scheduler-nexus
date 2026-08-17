
import React, { useEffect } from "react";
import InstrumentStatus from "../components/dashboard/InstrumentStatus";
import UpcomingBookings from "../components/dashboard/UpcomingBookings";
import CurrentBookings from "../components/dashboard/CurrentBookings";
import UsageStatistics from "../components/dashboard/UsageStatistics";
import { supabase } from "../integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { useOptimizedBooking } from "../contexts/OptimizedBookingContext";
import { Loader2 } from "lucide-react";

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { isLoading, isInitialized, refreshData } = useOptimizedBooking();
  
  useEffect(() => {
    // Check Supabase connection when dashboard loads
    const checkConnection = async () => {
      try {
        const { data, error } = await supabase.from('instruments').select('count');
        if (error) {
          console.error('Error connecting to Supabase:', error);
          toast.error('Error connecting to database');
        } else {
          console.log('Successfully connected to Supabase');
        }
      } catch (err) {
        console.error('Unexpected error:', err);
      }
    };
    
    if (user && isInitialized) {
      checkConnection();
    }
  }, [user, isInitialized]);

  // Ensure data is refreshed when dashboard loads
  useEffect(() => {
    if (user && !isInitialized && !isLoading) {
      console.log('Dashboard: Data not initialized, refreshing...');
      refreshData();
    }
  }, [user, isInitialized, isLoading, refreshData]);
  
  // Show loading only if data is not initialized yet
  if (!isInitialized && isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-7xl flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-mslab-400" />
        <span className="ml-2 text-lg text-mslab-400">Loading dashboard data...</span>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <InstrumentStatus />
        <UpcomingBookings />
        <CurrentBookings />
        <div className="col-span-1 lg:col-span-3 md:col-span-2">
          <UsageStatistics />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
