
import { useState, useCallback } from "react";
import { Booking, Comment, User } from "../types";
import { supabase } from "../integrations/supabase/client";
import { toast } from "sonner";
import { createDelayNotification, createBookingNotification, createStatusUpdateNotification, createCommentNotification, sendEmail } from "../utils/emailNotifications";

export const useBookings = (users: User[]) => {
  const [bookings, setBookings] = useState<Booking[]>([]);

  // Helper function to find user email by userId
  const getUserEmailById = async (userId: string): Promise<string> => {
    try {
      // First try to get from users array (if available)
      const user = users.find(u => u.id === userId);
      if (user?.email) {
        return user.email;
      }
      
      // Fallback to database query
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

  // Helper function to find user name by userId
  const getUserNameById = (userId: string): string => {
    const user = users.find(u => u.id === userId);
    return user?.name || "Unknown User";
  };

  // Load bookings from Supabase
  const loadBookings = useCallback(async () => {
    try {
      console.log("Loading bookings from Supabase");
      const { data, error } = await supabase
        .from('bookings')
        .select('*');

      if (error) {
        throw error;
      }
      
      // Transform Supabase data to match our Booking type
      if (data) {
        const bookingsWithComments: Booking[] = [];
        
        for (const booking of data) {
          try {
            // Get the instrument name for each booking
            const { data: instrumentData } = await supabase
              .from('instruments')
              .select('name')
              .eq('id', booking.instrument_id)
              .single();
              
            // Get the user name for each booking
            const { data: userData } = await supabase
              .from('profiles')
              .select('name')
              .eq('id', booking.user_id)
              .single();
              
            // Get comments for this booking
            const { data: commentsData, error: commentsError } = await supabase
              .from('comments')
              .select('*')
              .eq('booking_id', booking.id);
              
            if (commentsError) {
              console.error("Error fetching comments:", commentsError);
            }
              
            const formattedComments: Comment[] = [];
            
            if (commentsData) {
              // Fetch user names for each comment
              for (const comment of commentsData) {
                try {
                  const { data: commentUserData } = await supabase
                    .from('profiles')
                    .select('name')
                    .eq('id', comment.user_id)
                    .single();
                    
                  formattedComments.push({
                    id: comment.id,
                    userId: comment.user_id,
                    userName: commentUserData ? commentUserData.name : getUserNameById(comment.user_id),
                    content: comment.content,
                    createdAt: new Date(comment.created_at).toISOString()
                  });
                } catch (e) {
                  console.error("Error processing comment user data:", e);
                }
              }
            }
              
            const formattedBooking: Booking = {
              id: booking.id,
              userId: booking.user_id,
              userName: userData ? userData.name : "Unknown User",
              instrumentId: booking.instrument_id,
              instrumentName: instrumentData ? instrumentData.name : "Unknown Instrument",
              start: new Date(booking.start_time).toISOString(),
              end: new Date(booking.end_time).toISOString(),
              purpose: booking.purpose,
              status: booking.status,
              createdAt: new Date(booking.created_at).toISOString(),
              details: booking.details || "",
              comments: formattedComments
            };
            
            bookingsWithComments.push(formattedBooking);
          } catch (e) {
            console.error("Error processing booking:", e, booking);
          }
        }
        
        console.log(`Loaded ${bookingsWithComments.length} bookings from Supabase`);
        setBookings(bookingsWithComments);
      }
    } catch (error) {
      console.error("Error loading bookings:", error);
      toast.error("Failed to load bookings");
    }
  }, [users]);

  // Function to create a booking
  const createBooking = async (bookingData: Omit<Booking, "id" | "createdAt"> & { status: "pending" | "confirmed" | "cancelled" | "Not-Started" | "In-Progress" | "Completed" | "Delayed" }) => {
    try {
      console.log("Creating booking with data:", bookingData);
      
      // Insert into Supabase
      const { data, error } = await supabase
        .from('bookings')
        .insert({
          user_id: bookingData.userId,
          instrument_id: bookingData.instrumentId,
          start_time: bookingData.start,
          end_time: bookingData.end,
          purpose: bookingData.purpose,
          status: bookingData.status,
          details: bookingData.details || null
        })
        .select();

      if (error) {
        console.error("Supabase insert error:", error);
        throw new Error(`Database error: ${error.message}`);
      }
      
      if (data && data[0]) {
        console.log("Booking created successfully:", data[0]);
        
        // Reload bookings to get the updated list
        await loadBookings();
        
        // Send email notification for new booking
        try {
          const userEmail = await getUserEmailById(bookingData.userId);
          if (userEmail) {
            console.log("Sending booking confirmation email to:", userEmail);
            
            const bookingNotification = createBookingNotification(
              userEmail,
              bookingData.userName,
              bookingData.instrumentName,
              bookingData.start,
              bookingData.end
            );
            
            const emailSent = await sendEmail(bookingNotification);
            
            if (emailSent) {
              console.log("Booking confirmation email sent successfully");
              toast.success("Booking created and confirmation email sent");
            } else {
              console.error("Failed to send booking confirmation email");
              toast.success("Booking created but email notification failed");
            }
          } else {
            console.warn("No email found for user:", bookingData.userId);
            toast.success("Booking created (no email configured)");
          }
        } catch (emailError) {
          console.error("Failed to send booking confirmation email:", emailError);
          toast.success("Booking created but email notification failed");
        }
        
        return data[0];
      } else {
        throw new Error("No data returned from booking creation");
      }
    } catch (error) {
      console.error("Error creating booking:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create booking";
      toast.error(errorMessage);
      throw error;
    }
  };

  // Function to update a booking
  const updateBooking = async (bookingData: Booking) => {
    try {
      console.log("Updating booking with data:", bookingData);
      
      // Find the existing booking to compare status and other fields
      const existingBooking = bookings.find(booking => booking.id === bookingData.id);
      
      // Check if any booking fields have changed (excluding comments)
      const bookingFieldsChanged = existingBooking && (
        existingBooking.status !== bookingData.status ||
        existingBooking.start !== bookingData.start ||
        existingBooking.end !== bookingData.end ||
        existingBooking.purpose !== bookingData.purpose ||
        existingBooking.details !== bookingData.details ||
        existingBooking.instrumentId !== bookingData.instrumentId
      );
      
      // Update in Supabase
      const { error } = await supabase
        .from('bookings')
        .update({
          user_id: bookingData.userId,
          instrument_id: bookingData.instrumentId,
          start_time: bookingData.start,
          end_time: bookingData.end,
          purpose: bookingData.purpose,
          status: bookingData.status,
          details: bookingData.details || null
        })
        .eq('id', bookingData.id);

      if (error) {
        console.error("Error updating booking:", error);
        throw error;
      }

      console.log("Booking updated successfully in database");

      // Reload bookings to get the updated list
      await loadBookings();
      
      // Send status update notification only if booking fields have changed (not comments)
      if (bookingFieldsChanged) {
        try {
          const userEmail = await getUserEmailById(bookingData.userId);
          if (userEmail) {
            console.log("Sending booking update email to:", userEmail);
            
            const statusNotification = createStatusUpdateNotification(
              userEmail,
              bookingData.userName,
              bookingData.instrumentName,
              bookingData.status
            );
            
            const emailSent = await sendEmail(statusNotification);
            
            if (emailSent) {
              console.log("Booking update email sent successfully");
            } else {
              console.error("Failed to send booking update email");
            }
          }
        } catch (emailError) {
          console.error("Failed to send booking update email:", emailError);
        }
      }
      
      toast.success("Booking updated successfully");
    } catch (error) {
      console.error("Error updating booking:", error);
      toast.error("Failed to update booking");
      throw error;
    }
  };

  // Function to delete a booking
  const deleteBooking = async (bookingId: string) => {
    try {
      console.log("Deleting booking:", bookingId);
      
      // Delete from Supabase
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', bookingId);

      if (error) {
        console.error("Error deleting booking:", error);
        throw error;
      }

      console.log("Booking deleted successfully");
      
      // Reload bookings to get the updated list
      await loadBookings();
      toast.success("Booking deleted successfully");
    } catch (error) {
      console.error("Error deleting booking:", error);
      toast.error("Failed to delete booking");
    }
  };

  // Function to add a comment to a booking
  const addCommentToBooking = async (bookingId: string, comment: Omit<Comment, "id">): Promise<string | undefined> => {
    try {
      console.log("Adding comment to booking:", bookingId, comment);
      
      // Get booking details for email notification
      const booking = bookings.find(b => b.id === bookingId);
      if (!booking) {
        throw new Error("Booking not found");
      }
      
      // Insert into Supabase
      const { data, error } = await supabase
        .from('comments')
        .insert({
          booking_id: bookingId,
          user_id: comment.userId,
          content: comment.content
        })
        .select()
        .single();

      if (error) {
        console.error("Error inserting comment:", error);
        throw error;
      }

      if (data) {
        console.log("Comment added successfully:", data);
        
        // Reload bookings to update comments
        await loadBookings();
        
        // Send email notification for new comment if commenter is not the booking owner
        if (comment.userId !== booking.userId) {
          try {
            const userEmail = await getUserEmailById(booking.userId);
            const commentAuthor = comment.userName || getUserNameById(comment.userId);
            
            if (userEmail) {
              console.log("Sending comment notification email to:", userEmail);
              
              const commentNotification = createCommentNotification(
                userEmail,
                booking.userName,
                booking.instrumentName,
                commentAuthor,
                comment.content,
                new Date(booking.start).toLocaleString()
              );
              
              const emailSent = await sendEmail(commentNotification);
              
              if (emailSent) {
                console.log("Comment notification email sent successfully");
                toast.success("Comment added and notification sent");
              } else {
                console.error("Failed to send comment notification email");
                toast.success("Comment added (email notification failed)");
              }
            } else {
              toast.success("Comment added successfully");
            }
          } catch (emailError) {
            console.error("Failed to send comment notification email:", emailError);
            toast.success("Comment added (email notification failed)");
          }
        } else {
          toast.success("Comment added successfully");
        }
        
        // Return the new comment ID
        return data.id;
      }
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment");
      throw error;
    }
  };

  // Function to delete a comment from a booking
  const deleteCommentFromBooking = async (bookingId: string, commentId: string) => {
    try {
      console.log("Deleting comment:", commentId, "from booking:", bookingId);
      
      // Delete from Supabase
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) {
        console.error("Error deleting comment:", error);
        throw error;
      }

      console.log("Comment deleted successfully");
      
      // Reload bookings to get the updated comments
      await loadBookings();
      toast.success("Comment deleted successfully");
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error("Failed to delete comment");
      throw error;
    }
  };

  // Function to apply delay to bookings after a certain time
  const applyDelay = async (delayMinutes: number, startDateTime: Date) => {
    try {
      const startTime = startDateTime.getTime();
      
      // Get bookings that will be affected by the delay
      const affectedBookingsData = bookings.filter(booking => {
        const bookingStart = new Date(booking.start).getTime();
        return bookingStart >= startTime;
      });
      
      // Update all affected bookings
      for (const booking of affectedBookingsData) {
        const bookingStart = new Date(booking.start).getTime();
        const bookingEnd = new Date(booking.end).getTime();
        
        if (bookingStart >= startTime) {
          const newStart = new Date(bookingStart + delayMinutes * 60 * 1000).toISOString();
          const newEnd = new Date(bookingEnd + delayMinutes * 60 * 1000).toISOString();
          
          await supabase
            .from('bookings')
            .update({
              start_time: newStart,
              end_time: newEnd,
            })
            .eq('id', booking.id);
        }
      }
      
      // Reload bookings to get the updated list
      await loadBookings();
      
      // Send delay notifications to affected users
      for (const booking of affectedBookingsData) {
        try {
          const userEmail = await getUserEmailById(booking.userId);
          if (userEmail) {
            const notification = createDelayNotification(
              userEmail,
              booking.userName,
              booking.instrumentName,
              delayMinutes,
              booking.start,
              new Date(new Date(booking.start).getTime() + delayMinutes * 60 * 1000).toISOString(),
              new Date(new Date(booking.end).getTime() + delayMinutes * 60 * 1000).toISOString()
            );

            await sendEmail(notification);
          }
        } catch (error) {
          console.error("Failed to send delay notification:", error);
        }
      }
      
      toast.success(`Successfully applied ${delayMinutes} minute delay to ${affectedBookingsData.length} bookings`);
    } catch (error) {
      console.error("Error applying delay:", error);
      toast.error("Failed to apply delay to bookings");
      throw error;
    }
  };

  return {
    bookings,
    setBookings,
    loadBookings,
    createBooking,
    updateBooking,
    deleteBooking,
    addCommentToBooking,
    deleteCommentFromBooking,
    applyDelay
  };
};
