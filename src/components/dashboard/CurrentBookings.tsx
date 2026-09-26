
import React, { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { useOptimizedBooking } from "../../contexts/OptimizedBookingContext";
import { useAuth } from "../../contexts/AuthContext";
import { Loader2, Clock } from "lucide-react";
import { format, isToday } from "date-fns";

const CurrentBookings: React.FC = () => {
  const { bookings, isLoading, refreshData } = useOptimizedBooking();
  const { user } = useAuth();

  // Refresh data when component mounts if no bookings are loaded
  useEffect(() => {
    if (!isLoading && bookings.length === 0) {
      console.log("No bookings loaded, refreshing data...");
      refreshData();
    }
  }, [bookings.length, isLoading, refreshData]);

  // Get current bookings (in progress today)
  const now = new Date();
  const currentBookings = bookings.filter(booking => {
    const bookingStart = new Date(booking.start);
    const bookingEnd = new Date(booking.end);
    
    return (
      booking.status === "In-Progress" ||
      (isToday(bookingStart) && now >= bookingStart && now <= bookingEnd)
    );
  });

  // Filter based on user role
  const filteredBookings = user?.role === "admin" 
    ? currentBookings 
    : currentBookings.filter(booking => booking.userId === user?.id);

  const formatTimeRange = (start: string, end: string): string => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return `${format(startDate, "h:mm a")} - ${format(endDate, "h:mm a")}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Current Bookings
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span className="text-sm text-muted-foreground">Loading current bookings...</span>
          </div>
        ) : filteredBookings.length > 0 ? (
          <div className="space-y-4">
            {filteredBookings.map((booking) => (
              <div key={booking.id} className="flex flex-col border-b pb-3 last:border-b-0">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{booking.instrumentName}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatTimeRange(booking.start, booking.end)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      User: {booking.userName}
                    </p>
                  </div>
                  <Badge 
                    variant="outline" 
                    className="bg-blue-50 border-blue-200 text-blue-800"
                  >
                    In Progress
                  </Badge>
                </div>
                {booking.purpose && (
                  <p className="text-sm mt-1">{booking.purpose}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-4">
            <p>No current bookings in progress</p>
            <p className="text-xs mt-1">Active bookings will appear here</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CurrentBookings;
