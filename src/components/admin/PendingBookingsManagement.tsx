
import React, { useState, useMemo } from "react";
import { useOptimizedBooking } from "../../contexts/OptimizedBookingContext";
import { useAuth } from "../../contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "../ui/table";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import { format } from "date-fns";
import { Clock, User, FileText, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { sendEmail, createStatusUpdateNotification } from "../../utils/emailNotifications";
import { supabase } from "../../integrations/supabase/client";

const PendingBookingsManagement: React.FC = () => {
  const { bookings, updateBooking } = useOptimizedBooking();
  const { user } = useAuth();
  const [processingBooking, setProcessingBooking] = useState<{ [key: string]: boolean }>({});

  // Filter pending bookings - check for both "pending" and any status that needs approval
  const pendingBookings = useMemo(() => {
    console.log("All bookings:", bookings);
    const filtered = bookings.filter(booking => {
      console.log(`Booking ${booking.id} status: ${booking.status}`);
      return booking.status === "pending" || booking.status === "Pending";
    }).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    
    console.log("Filtered pending bookings:", filtered);
    return filtered;
  }, [bookings]);

  // Helper function to get user email by userId
  const getUserEmailById = async (userId: string): Promise<string> => {
    try {
      const { data: userData, error } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error("Error fetching user email:", error);
        return "";
      }
      
      return userData?.email || "";
    } catch (error) {
      console.error("Error in getUserEmailById:", error);
      return "";
    }
  };

  const handleApproveBooking = async (booking: any) => {
    setProcessingBooking(prev => ({ ...prev, [booking.id]: true }));
    
    try {
      await updateBooking({
        ...booking,
        status: "confirmed"
      });

      // Send approval email notification
      try {
        const userEmail = await getUserEmailById(booking.userId);
        if (userEmail) {
          console.log("Sending approval email to:", userEmail);
          
          const approvalNotification = createStatusUpdateNotification(
            userEmail,
            booking.userName,
            booking.instrumentName,
            "confirmed"
          );
          
          // Add emailType parameter for proper email preference checking
          const emailSent = await sendEmail({ ...approvalNotification, emailType: 'notification' });
          
          if (emailSent) {
            console.log("Approval email sent successfully");
          } else {
            console.error("Failed to send approval email");
          }
        } else {
          console.warn("No email found for user:", booking.userId);
        }
      } catch (emailError) {
        console.error("Failed to send approval email:", emailError);
      }

      toast.success(`Booking for ${booking.instrumentName} approved`);
    } catch (error) {
      console.error("Failed to approve booking:", error);
      toast.error("Failed to approve booking");
    } finally {
      setProcessingBooking(prev => ({ ...prev, [booking.id]: false }));
    }
  };

  const handleDenyBooking = async (booking: any) => {
    setProcessingBooking(prev => ({ ...prev, [booking.id]: true }));
    
    try {
      await updateBooking({
        ...booking,
        status: "cancelled"
      });

      // Send denial email notification
      try {
        const userEmail = await getUserEmailById(booking.userId);
        if (userEmail) {
          console.log("Sending denial email to:", userEmail);
          
          const denialNotification = createStatusUpdateNotification(
            userEmail,
            booking.userName,
            booking.instrumentName,
            "cancelled"
          );
          
          // Add emailType parameter for proper email preference checking
          const emailSent = await sendEmail({ ...denialNotification, emailType: 'notification' });
          
          if (emailSent) {
            console.log("Denial email sent successfully");
          } else {
            console.error("Failed to send denial email");
          }
        } else {
          console.warn("No email found for user:", booking.userId);
        }
      } catch (emailError) {
        console.error("Failed to send denial email:", emailError);
      }

      toast.success(`Booking for ${booking.instrumentName} denied`);
    } catch (error) {
      console.error("Failed to deny booking:", error);
      toast.error("Failed to deny booking");
    } finally {
      setProcessingBooking(prev => ({ ...prev, [booking.id]: false }));
    }
  };

  if (user?.role !== "admin") {
    return null;
  }

  console.log("Rendering PendingBookingsManagement with", pendingBookings.length, "pending bookings");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Pending Booking Approvals
        </CardTitle>
        <CardDescription>
          Review and approve or deny booking requests from users
        </CardDescription>
      </CardHeader>
      <CardContent>
        {pendingBookings.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <h3 className="text-lg font-medium mb-2">No pending bookings</h3>
            <p className="text-muted-foreground">
              All booking requests have been processed.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Total bookings in system: {bookings.length}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {pendingBookings.length} booking{pendingBookings.length !== 1 ? 's' : ''} awaiting approval
              </p>
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Instrument</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingBookings.map((booking) => {
                  const startDate = new Date(booking.start);
                  const endDate = new Date(booking.end);
                  const durationHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
                  
                  return (
                    <TableRow key={booking.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {booking.userName}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {booking.instrumentName}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div>{format(startDate, "MMM d, yyyy")}</div>
                          <div className="text-sm text-muted-foreground">
                            {format(startDate, "h:mm a")} - {format(endDate, "h:mm a")}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {durationHours === 1 ? "1 hour" : `${durationHours} hours`}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          <div className="truncate" title={booking.purpose}>
                            {booking.purpose}
                          </div>
                          {booking.details && (
                            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              Details available
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {booking.status === "pending" ? "Pending Approval" : booking.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                disabled={processingBooking[booking.id]}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Approve Booking</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to approve this booking for {booking.instrumentName} 
                                  on {format(startDate, "MMM d, yyyy")} from {format(startDate, "h:mm a")} 
                                  to {format(endDate, "h:mm a")}?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel disabled={processingBooking[booking.id]}>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleApproveBooking(booking)}
                                  disabled={processingBooking[booking.id]}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  {processingBooking[booking.id] ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      Approving...
                                    </>
                                  ) : (
                                    "Approve Booking"
                                  )}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                disabled={processingBooking[booking.id]}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Deny Booking</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to deny this booking request for {booking.instrumentName}? 
                                  The user will be notified that their request was not approved.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel disabled={processingBooking[booking.id]}>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDenyBooking(booking)}
                                  disabled={processingBooking[booking.id]}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  {processingBooking[booking.id] ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      Denying...
                                    </>
                                  ) : (
                                    "Deny Booking"
                                  )}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PendingBookingsManagement;
