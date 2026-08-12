import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from "react";
import { Instrument, Booking, BookingStatistics, Comment } from "../types";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";
import { supabase } from "../integrations/supabase/client";
import { sendEmail, createBookingNotification, createStatusUpdateNotification, createCommentNotification } from "../utils/emailNotifications";

interface OptimizedBookingContextType {
  bookings: Booking[];
  instruments: Instrument[];
  statistics: BookingStatistics;
  isLoading: boolean;
  isInitialized: boolean;
  createBooking: (bookingData: Omit<Booking, "id" | "createdAt">) => Promise<any>;
  updateBooking: (bookingData: Booking) => Promise<void>;
  deleteBooking: (bookingId: string) => Promise<void>;
  addInstrument: (instrumentData: Omit<Instrument, "id">) => Promise<void>;
  updateInstrument: (instrumentData: Instrument) => Promise<void>;
  deleteInstrument: (instrumentId: string) => Promise<void>;
  addCommentToBooking: (bookingId: string, comment: Omit<Comment, "id">) => Promise<string | undefined>;
  deleteCommentFromBooking: (bookingId: string, commentId: string) => Promise<void>;
  getStatusColor: (status: string) => string;
  refreshData: () => Promise<void>;
  applyDelay: (delayMinutes: number, startDateTime: Date) => Promise<void>;
}

const OptimizedBookingContext = createContext<OptimizedBookingContextType | undefined>(undefined);

export const OptimizedBookingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, users, isAuthenticated, isLoading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [statusColors, setStatusColors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [lastFetch, setLastFetch] = useState<number>(0);

  // Helper function to get user email by userId
  const getUserEmailById = useCallback(async (userId: string): Promise<string> => {
    return users.find(u => u.id === userId)?.email || "";
  }, [users]);

  // Memoized status color function
  const getStatusColor = useCallback((status: string) => {
    return statusColors[status] || '#6b7280';
  }, [statusColors]);

  // Load status colors
  const loadStatusColors = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('status_colors')
        .select('status, color');
      
      if (error) throw error;
      
      const colorsMap = data.reduce((acc, item) => {
        acc[item.status] = item.color;
        return acc;
      }, {} as Record<string, string>);
      
      setStatusColors(colorsMap);
    } catch (error) {
      console.error('Error loading status colors:', error);
    }
  }, []);

  // Load instruments with caching and proper typing
  const loadInstruments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('instruments')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      // Transform database data to match Instrument interface
      const transformedInstruments: Instrument[] = (data || []).map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        location: item.location,
        specifications: item.specifications,
        image: item.image,
        type: item.type,
        model: item.model,
        calibrationDue: item.calibration_due,
        // Ensure status matches the expected type
        status: (item.status as "available" | "in_use" | "maintenance" | "offline") || "available"
      }));
      
      setInstruments(transformedInstruments);
      return transformedInstruments;
    } catch (error) {
      console.error('Error loading instruments:', error);
      toast.error('Failed to load instruments');
      return [];
    }
  }, []);

  // Load bookings and their comments separately
  const loadBookings = useCallback(async (instrumentsData?: Instrument[]) => {
    try {
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .order('start_time', { ascending: true });

      if (bookingsError) throw bookingsError;

      const bookingIds = (bookingsData || []).map(b => b.id);
      const commentsByBooking: Record<string, Comment[]> = {};

      if (bookingIds.length) {
        const { data: commentsData, error: commentsError } = await supabase
          .from('comments')
          .select('*')
          .in('booking_id', bookingIds)
          .order('created_at', { ascending: true });

        if (!commentsError && commentsData) {
          for (const c of commentsData) {
            const list = commentsByBooking[c.booking_id] || [];
            list.push({
              id: c.id,
              content: c.content,
              createdAt: c.created_at,
              userId: c.user_id,
              userName: users.find(u => u.id === c.user_id)?.name || 'Unknown User'
            });
            commentsByBooking[c.booking_id] = list;
          }
        }
      }

      const currentInstruments = instrumentsData || instruments;
      const transformedBookings: Booking[] = (bookingsData || []).map(booking => ({
        id: booking.id,
        userId: booking.user_id,
        userName: users.find(u => u.id === booking.user_id)?.name || 'Unknown User',
        instrumentId: booking.instrument_id,
        instrumentName: currentInstruments.find(i => i.id === booking.instrument_id)?.name || 'Unknown Instrument',
        start: booking.start_time,
        end: booking.end_time,
        purpose: booking.purpose,
        details: booking.details,
        status: booking.status,
        createdAt: booking.created_at,
        sequenceFileKey: (booking as any).sequence_file_key ?? null,
        sequenceFileName: (booking as any).sequence_file_name ?? null,
        sequenceFileSize: (booking as any).sequence_file_size ?? null,
        sequenceFileUploadedAt: (booking as any).sequence_file_uploaded_at ?? null,
        comments: commentsByBooking[booking.id] || []
      }));

      setBookings(transformedBookings);
      return transformedBookings;
    } catch (error) {
      console.error('Error loading bookings:', error);
      toast.error('Failed to load bookings');
      return [];
    }
  }, [users, instruments]);

  // Optimized initial data load
  const initializeData = useCallback(async () => {
    if (!isAuthenticated || authLoading || isInitialized) {
      console.log('OptimizedBookingContext: Skipping initialization', { isAuthenticated, authLoading, isInitialized });
      return;
    }
    
    console.log('OptimizedBookingContext: Starting initialization...');
    setIsLoading(true);
    
    try {
      // Load instruments first, then use them for bookings
      const [instrumentsData] = await Promise.all([
        loadInstruments(),
        loadStatusColors()
      ]);
      
      // Load bookings with instrument data
      await loadBookings(instrumentsData);
      
      setIsInitialized(true);
      setLastFetch(Date.now());
      console.log('OptimizedBookingContext: Initialization complete');
    } catch (error) {
      console.error('OptimizedBookingContext: Error during initialization:', error);
      toast.error('Failed to initialize application data');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, authLoading, isInitialized, loadInstruments, loadBookings, loadStatusColors]);

  // Optimized refresh function with throttling
  const refreshData = useCallback(async () => {
    const now = Date.now();
    if (now - lastFetch < 1000) { // Throttle to max once per second
      return;
    }
    
    if (!isAuthenticated || authLoading) return;
    
    setIsLoading(true);
    try {
      console.log('OptimizedBookingContext: Refreshing data...');
      const instrumentsData = await loadInstruments();
      await Promise.all([
        loadBookings(instrumentsData),
        loadStatusColors()
      ]);
      setLastFetch(now);
    } catch (error) {
      console.error('OptimizedBookingContext: Error refreshing data:', error);
      toast.error('Failed to refresh data');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, authLoading, loadInstruments, loadBookings, loadStatusColors, lastFetch]);

  // Initialize data when authenticated and auth is ready
  useEffect(() => {
    if (isAuthenticated && !authLoading && !isInitialized) {
      console.log('OptimizedBookingContext: Auth ready, initializing data...');
      initializeData();
    }
  }, [isAuthenticated, authLoading, isInitialized, initializeData]);

  // Reset state when user logs out
  useEffect(() => {
    if (!isAuthenticated && !authLoading && isInitialized) {
      console.log('OptimizedBookingContext: User logged out, resetting state');
      setBookings([]);
      setInstruments([]);
      setStatusColors({});
      setIsInitialized(false);
      setIsLoading(false);
    }
  }, [isAuthenticated, authLoading, isInitialized]);

  // Optimized CRUD operations
  const createBooking = useCallback(async (bookingData: Omit<Booking, "id" | "createdAt">) => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .insert({
          user_id: bookingData.userId,
          instrument_id: bookingData.instrumentId,
          start_time: bookingData.start,
          end_time: bookingData.end,
          purpose: bookingData.purpose,
          details: bookingData.details,
          status: bookingData.status
        })
        .select()
        .single();

      if (error) throw error;

      const newBooking: Booking = {
        id: data.id,
        userId: bookingData.userId,
        userName: bookingData.userName,
        instrumentId: bookingData.instrumentId,
        instrumentName: bookingData.instrumentName,
        start: bookingData.start,
        end: bookingData.end,
        purpose: bookingData.purpose,
        details: bookingData.details,
        status: bookingData.status,
        createdAt: data.created_at,
        comments: []
      };

      setBookings(prev => [...prev, newBooking]);

      // Send email notification for new booking
      try {
        const userEmail = await getUserEmailById(bookingData.userId);
        if (userEmail) {
          console.log("Sending new booking email to:", userEmail);
          const notification = createBookingNotification(
            userEmail,
            bookingData.userName,
            bookingData.instrumentName,
            newBooking.start,
            newBooking.end,
          );
          
          // Add emailType parameter for proper email preference checking
          const emailSent = await sendEmail({ ...notification, emailType: 'notification' });
          
          if (emailSent) {
            console.log("New booking email notification sent successfully");
          } else {
            console.error("Failed to send new booking email");
          }
        } else {
          console.warn("No email found for user:", bookingData.userId);
        }
      } catch (emailError) {
        console.error("Failed to send new booking email:", emailError);
      }

      return data;
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  }, [getUserEmailById]);

  const updateBooking = useCallback(async (bookingData: Booking) => {
    try {
      // Get original booking for comparison
      const originalBooking = bookings.find(b => b.id === bookingData.id);
      
      const { error } = await supabase
        .from('bookings')
        .update({
          instrument_id: bookingData.instrumentId,
          start_time: bookingData.start,
          end_time: bookingData.end,
          purpose: bookingData.purpose,
          details: bookingData.details,
          status: bookingData.status
        })
        .eq('id', bookingData.id);

      if (error) throw error;

      setBookings(prev => prev.map(booking => 
        booking.id === bookingData.id ? bookingData : booking
      ));

      // Send email notification if status changed
      if (originalBooking && originalBooking.status !== bookingData.status) {
        try {
          const userEmail = await getUserEmailById(bookingData.userId);
          if (userEmail) {
            console.log("Sending status update email to:", userEmail);
            const notification = createStatusUpdateNotification(
              userEmail,
              bookingData.userName,
              bookingData.instrumentName,
              bookingData.status
            );
            
            // Add emailType parameter for proper email preference checking
            const emailSent = await sendEmail({ ...notification, emailType: 'notification' });
            
            if (emailSent) {
              console.log("Status update email notification sent successfully");
            } else {
              console.error("Failed to send status update email");
            }
          } else {
            console.warn("No email found for user:", bookingData.userId);
          }
        } catch (emailError) {
          console.error("Failed to send status update email:", emailError);
        }
      }
    } catch (error) {
      console.error('Error updating booking:', error);
      throw error;
    }
  }, [bookings, getUserEmailById]);

  const deleteBooking = useCallback(async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', bookingId);

      if (error) throw error;

      setBookings(prev => prev.filter(booking => booking.id !== bookingId));
    } catch (error) {
      console.error('Error deleting booking:', error);
      throw error;
    }
  }, []);

  const addInstrument = useCallback(async (instrumentData: Omit<Instrument, "id">) => {
    try {
      const { data, error } = await supabase
        .from('instruments')
        .insert({
          name: instrumentData.name,
          description: instrumentData.description,
          location: instrumentData.location,
          specifications: instrumentData.specifications,
          image: instrumentData.image,
          type: instrumentData.type,
          model: instrumentData.model,
          calibration_due: instrumentData.calibrationDue,
          status: instrumentData.status
        })
        .select()
        .single();

      if (error) throw error;

      const newInstrument: Instrument = {
        id: data.id,
        name: data.name,
        description: data.description,
        location: data.location,
        specifications: data.specifications,
        image: data.image,
        type: data.type,
        model: data.model,
        calibrationDue: data.calibration_due,
        status: data.status as "available" | "in_use" | "maintenance" | "offline"
      };

      setInstruments(prev => [...prev, newInstrument]);
    } catch (error) {
      console.error('Error adding instrument:', error);
      throw error;
    }
  }, []);

  const updateInstrument = useCallback(async (instrumentData: Instrument) => {
    try {
      const { error } = await supabase
        .from('instruments')
        .update({
          name: instrumentData.name,
          description: instrumentData.description,
          location: instrumentData.location,
          specifications: instrumentData.specifications,
          image: instrumentData.image,
          type: instrumentData.type,
          model: instrumentData.model,
          calibration_due: instrumentData.calibrationDue,
          status: instrumentData.status
        })
        .eq('id', instrumentData.id);

      if (error) throw error;

      setInstruments(prev => prev.map(inst => 
        inst.id === instrumentData.id ? instrumentData : inst
      ));
    } catch (error) {
      console.error('Error updating instrument:', error);
      throw error;
    }
  }, []);

  const deleteInstrument = useCallback(async (instrumentId: string) => {
    try {
      const { error } = await supabase
        .from('instruments')
        .delete()
        .eq('id', instrumentId);

      if (error) throw error;

      setInstruments(prev => prev.filter(inst => inst.id !== instrumentId));
    } catch (error) {
      console.error('Error deleting instrument:', error);
      throw error;
    }
  }, []);

  const addCommentToBooking = useCallback(async (bookingId: string, comment: Omit<Comment, "id">) => {
    try {
      console.log("Adding comment to booking:", bookingId, "Comment:", comment);
      
      const { data, error } = await supabase
        .from('comments')
        .insert({
          booking_id: bookingId,
          user_id: comment.userId,
          content: comment.content
        })
        .select()
        .single();

      if (error) throw error;

      const newComment: Comment = {
        id: data.id,
        content: comment.content,
        createdAt: data.created_at,
        userId: comment.userId,
        userName: comment.userName
      };

      setBookings(prev => prev.map(booking => 
        booking.id === bookingId 
          ? { ...booking, comments: [...(booking.comments || []), newComment] }
          : booking
      ));

      // Send email notification for new comment
      try {
        const booking = bookings.find(b => b.id === bookingId);
        if (booking) {
          console.log("Found booking for comment notification:", booking);
          
          // Only send notification if the commenter is not the booking owner
          if (booking.userId !== comment.userId) {
            const userEmail = await getUserEmailById(booking.userId);
            console.log("Booking owner email:", userEmail);
            
            if (userEmail) {
              console.log("Sending comment notification email to booking owner:", userEmail);
              
              const notification = createCommentNotification(
                userEmail,
                booking.userName,
                booking.instrumentName,
                comment.userName,
                comment.content,
                new Date(booking.start).toLocaleString()
              );
              
              console.log("Comment notification payload:", notification);
              
              const emailSent = await sendEmail({ ...notification, emailType: 'notification' });
              
              if (emailSent) {
                console.log("Comment email notification sent successfully");
                toast.success("Comment added and notification sent");
              } else {
                console.error("Failed to send comment email notification");
                toast.success("Comment added (email notification failed)");
              }
            } else {
              console.warn("No email found for booking owner:", booking.userId);
              toast.success("Comment added");
            }
          } else {
            console.log("Not sending notification - commenter is the booking owner");
            toast.success("Comment added");
          }
        } else {
          console.error("Booking not found for comment notification:", bookingId);
          toast.success("Comment added");
        }
      } catch (emailError) {
        console.error("Failed to send comment email notification:", emailError);
        toast.success("Comment added (email notification failed)");
      }

      return data.id;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  }, [bookings, getUserEmailById]);

  const deleteCommentFromBooking = useCallback(async (bookingId: string, commentId: string) => {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      setBookings(prev => prev.map(booking => 
        booking.id === bookingId 
          ? { ...booking, comments: booking.comments?.filter(c => c.id !== commentId) || [] }
          : booking
      ));
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw error;
    }
  }, []);

  const applyDelay = useCallback(async (delayMinutes: number, startDateTime: Date) => {
    try {
      const delayMs = delayMinutes * 60 * 1000;
      const affectedBookings = bookings.filter(booking => {
        const bookingStart = new Date(booking.start);
        return bookingStart >= startDateTime;
      });

      const updatePromises = affectedBookings.map(booking => {
        const newStart = new Date(new Date(booking.start).getTime() + delayMs);
        const newEnd = new Date(new Date(booking.end).getTime() + delayMs);
        
        return supabase
          .from('bookings')
          .update({
            start_time: newStart.toISOString(),
            end_time: newEnd.toISOString()
          })
          .eq('id', booking.id);
      });

      await Promise.all(updatePromises);
      
      setBookings(prev => prev.map(booking => {
        const bookingStart = new Date(booking.start);
        if (bookingStart >= startDateTime) {
          const newStart = new Date(new Date(booking.start).getTime() + delayMs);
          const newEnd = new Date(new Date(booking.end).getTime() + delayMs);
          return {
            ...booking,
            start: newStart.toISOString(),
            end: newEnd.toISOString()
          };
        }
        return booking;
      }));

      toast.success(`Applied ${delayMinutes} minute delay to ${affectedBookings.length} bookings`);
    } catch (error) {
      console.error('Error applying delay:', error);
      throw error;
    }
  }, [bookings]);

  // Memoized statistics calculation with proper typing
  const statistics = useMemo((): BookingStatistics => {
    const totalBookings = bookings.length;
    
    const instrumentUsage = instruments.map(instrument => {
      const instrumentBookings = bookings.filter(b => b.instrumentId === instrument.id);
      const totalHours = instrumentBookings.reduce((sum, booking) => {
        const start = new Date(booking.start);
        const end = new Date(booking.end);
        return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      }, 0);
      
      return {
        instrumentId: instrument.id,
        instrumentName: instrument.name,
        bookingCount: instrumentBookings.length,
        totalHours: Math.round(totalHours * 100) / 100
      };
    }).sort((a, b) => b.totalHours - a.totalHours); // Ensure proper sorting by totalHours descending

    const userBookings = users.map(user => {
      const userBookingList = bookings.filter(b => b.userId === user.id);
      const totalHours = userBookingList.reduce((sum, booking) => {
        const start = new Date(booking.start);
        const end = new Date(booking.end);
        return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      }, 0);

      return {
        userId: user.id,
        userName: user.name,
        bookingCount: userBookingList.length,
        totalHours: Math.round(totalHours * 100) / 100
      };
    }).sort((a, b) => b.totalHours - a.totalHours); // Sort by totalHours descending

    const weeklyUsage = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayBookings = bookings.filter(booking => {
        const bookingDate = new Date(booking.start);
        return bookingDate.toDateString() === date.toDateString();
      });
      return {
        week: date.toLocaleDateString('en-US', { weekday: 'short' }),
        bookingCount: dayBookings.length
      };
    }).reverse();

    console.log('Statistics calculated - instrumentUsage:', instrumentUsage.map(i => ({ name: i.instrumentName, hours: i.totalHours, bookings: i.bookingCount })));

    return {
      totalBookings,
      instrumentUsage,
      userBookings,
      weeklyUsage
    };
  }, [bookings, instruments, users]);

  const contextValue = useMemo(() => ({
    bookings,
    instruments,
    statistics,
    isLoading,
    isInitialized,
    createBooking,
    updateBooking,
    deleteBooking,
    addInstrument,
    updateInstrument,
    deleteInstrument,
    addCommentToBooking,
    deleteCommentFromBooking,
    getStatusColor,
    refreshData,
    applyDelay
  }), [
    bookings,
    instruments,
    statistics,
    isLoading,
    isInitialized,
    createBooking,
    updateBooking,
    deleteBooking,
    addInstrument,
    updateInstrument,
    deleteInstrument,
    addCommentToBooking,
    deleteCommentFromBooking,
    getStatusColor,
    refreshData,
    applyDelay
  ]);

  return (
    <OptimizedBookingContext.Provider value={contextValue}>
      {children}
    </OptimizedBookingContext.Provider>
  );
};

export const useOptimizedBooking = () => {
  const context = useContext(OptimizedBookingContext);
  if (context === undefined) {
    throw new Error('useOptimizedBooking must be used within an OptimizedBookingProvider');
  }
  return context;
};
