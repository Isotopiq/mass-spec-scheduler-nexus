
import React, { useState } from "react";
import { Button } from "../ui/button";
import { Trash2, Loader2 } from "lucide-react";
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
import { useBooking } from "../../contexts/BookingContext";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../integrations/supabase/client";
import { toast } from "sonner";

const DeleteCompletedBookingsButton: React.FC = () => {
  const { bookings, refreshData } = useBooking();
  const { user } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);

  // Only show for admins
  if (user?.role !== "admin") {
    return null;
  }

  const completedBookings = bookings.filter(booking => booking.status === "Completed");

  const handleDeleteCompleted = async () => {
    if (completedBookings.length === 0) {
      toast.info("No completed bookings to delete");
      return;
    }

    setIsDeleting(true);
    try {
      // Delete all completed bookings
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('status', 'Completed');

      if (error) {
        throw error;
      }

      await refreshData();
      toast.success(`Successfully deleted ${completedBookings.length} completed bookings`);
    } catch (error) {
      console.error("Error deleting completed bookings:", error);
      toast.error("Failed to delete completed bookings");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
          disabled={completedBookings.length === 0}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Completed ({completedBookings.length})
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Completed Bookings</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete all {completedBookings.length} completed bookings? 
            This action cannot be undone and will permanently remove all completed booking records.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteCompleted}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete All Completed"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteCompletedBookingsButton;
