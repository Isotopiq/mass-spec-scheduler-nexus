
import React, { useEffect } from "react";
import { format, isToday, isTomorrow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { useOptimizedBooking } from "../../contexts/OptimizedBookingContext";
import { useAuth } from "../../contexts/AuthContext";
import { Loader2 } from "lucide-react";

const UpcomingBookings: React.FC = () => {
  const { bookings, isLoading, refreshData, isInitialized } = useOptimizedBooking();
  const { user } = useAuth();

  // Refresh data when component mounts if not initialized
  useEffect(() => {
    if (!isInitialized && !isLoading) {
      console.log("UpcomingBookings: Data not initialized, refreshing...");
      refreshData();
    }
  }, [isInitialized, isLoading, refreshData]);

  console.log("UpcomingBookings - Debug info:", {
    totalBookings: bookings.length,
    currentUser: user?.id,
    userRole: user?.role,
    isLoading,
    isInitialized,
    bookingsData: bookings.map(b => ({
      id: b.id,
      start: b.start,
      status: b.status,
      userId: b.userId,
      instrumentName: b.instrumentName
    }))
  });

  // Get upcoming bookings for the current user or all bookings if admin
  const now = new Date();
  
  const upcoming = bookings
    .filter(booking => {
      const bookingStart = new Date(booking.start);
      
      // Must be a future booking
      const isFuture = bookingStart > now;
      // Must be confirmed
      const isConfirmed = booking.status === "confirmed";
      // User must own the booking or be admin
      const hasAccess = user?.role === "admin" || booking.userId === user?.id;
      
      console.log(`Booking ${booking.id} filter check:`, {
        start: bookingStart.toISOString(),
        now: now.toISOString(),
        isFuture,
        isConfirmed,
        hasAccess,
        status: booking.status,
        userId: booking.userId,
        currentUserId: user?.id
      });
      
      return isFuture && isConfirmed && hasAccess;
    })
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, 5);

  console.log("UpcomingBookings - Filtered upcoming bookings:", upcoming.length);

  // Format the date string nicely
  const formatDateDisplay = (dateStr: string | Date): string => {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    
    if (isToday(date)) {
      return `Today at ${format(date, "h:mm a")}`;
    } else if (isTomorrow(date)) {
      return `Tomorrow at ${format(date, "h:mm a")}`;
    } else {
      return format(date, "MMM d 'at' h:mm a");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium">Upcoming Bookings</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && !isInitialized ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span className="text-sm text-muted-foreground">Loading bookings...</span>
          </div>
        ) : upcoming.length > 0 ? (
          <div className="space-y-4">
            {upcoming.map((booking) => (
              <div key={booking.id} className="flex flex-col border-b pb-2 last:border-b-0">
                <div className="flex justify-between items-center">
                  <p className="font-medium">{booking.instrumentName}</p>
                  <span className="text-sm text-muted-foreground">
                    {formatDateDisplay(booking.start)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Booked by: {booking.userName}
                </p>
                {booking.purpose && (
                  <p className="text-sm">{booking.purpose}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-4">
            <p>No upcoming bookings</p>
            <p className="text-xs mt-1">
              {!isInitialized 
                ? "Loading..." 
                : bookings.length === 0 
                  ? "No bookings found" 
                  : `Found ${bookings.length} total bookings, none upcoming`
              }
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UpcomingBookings;
