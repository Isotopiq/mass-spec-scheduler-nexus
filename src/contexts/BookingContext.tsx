
import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from "react";
import { Instrument, Booking, BookingStatistics, Comment } from "../types";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";
import { useInstruments } from "../hooks/useInstruments";
import { useBookings } from "../hooks/useBookings";
import { useBookingStatistics } from "../hooks/useBookingStatistics";
import { useStatusColors } from "../hooks/useStatusColors";

interface BookingContextType {
  bookings: Booking[];
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>;
  instruments: Instrument[];
  addInstrument: (instrumentData: Omit<Instrument, "id">) => Promise<void>;
  updateInstrument: (instrumentData: Instrument) => Promise<void>;
  deleteInstrument: (instrumentId: string) => Promise<void>;
  deleteBooking: (bookingId: string) => Promise<void>;
  createBooking: (bookingData: Omit<Booking, "id" | "createdAt"> & { status: "pending" | "confirmed" | "cancelled" | "Not-Started" | "In-Progress" | "Completed" | "Delayed" }) => Promise<any>;
  updateBooking: (bookingData: Booking) => Promise<void>;
  applyDelay: (delayMinutes: number, startDateTime: Date) => Promise<void>;
  statistics: BookingStatistics;
  addCommentToBooking: (bookingId: string, comment: Omit<Comment, "id">) => Promise<string | undefined>;
  deleteCommentFromBooking: (bookingId: string, commentId: string) => Promise<void>;
  getStatusColor: (status: string) => string;
  isLoading: boolean;
  refreshData: () => Promise<void>;
}

export const BookingContext = createContext<BookingContextType>({
  bookings: [],
  setBookings: () => {},
  instruments: [],
  addInstrument: async () => {},
  updateInstrument: async () => {},
  deleteInstrument: async () => {},
  deleteBooking: async () => {},
  createBooking: async () => {},
  updateBooking: async () => {},
  applyDelay: async () => {},
  statistics: {
    totalBookings: 0,
    instrumentUsage: [],
    userBookings: [],
    weeklyUsage: []
  },
  addCommentToBooking: async () => undefined,
  deleteCommentFromBooking: async () => {},
  getStatusColor: () => '#6b7280',
  isLoading: true,
  refreshData: async () => {}
});

export const BookingProvider = ({ children }: { children: React.ReactNode }) => {
  const { users, isLoading: authLoading, isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Use our custom hooks
  const { 
    instruments, 
    addInstrument, 
    updateInstrument, 
    deleteInstrument, 
    loadInstruments 
  } = useInstruments();
  
  const { 
    bookings, 
    setBookings, 
    createBooking, 
    updateBooking, 
    deleteBooking,
    addCommentToBooking,
    deleteCommentFromBooking,
    loadBookings,
    applyDelay
  } = useBookings(users);
  
  const { getStatusColor, loadStatusColors } = useStatusColors();
  
  const statistics = useBookingStatistics(bookings, instruments);

  // Memoize the refresh function to prevent unnecessary re-renders
  const refreshData = useCallback(async () => {
    if (!isAuthenticated) {
      console.log("Not authenticated, skipping data refresh");
      setIsLoading(false);
      return;
    }
    
    console.log("BookingContext: Starting data refresh");
    setIsLoading(true);
    
    try {
      await Promise.all([
        loadInstruments(),
        loadBookings(),
        loadStatusColors()
      ]);
      console.log("BookingContext: Data refresh complete");
      // Force a re-render by incrementing refresh key
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error("BookingContext: Error refreshing data:", error);
      toast.error("Failed to refresh data");
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, loadInstruments, loadBookings, loadStatusColors]);

  // Initial data load - use useMemo to prevent recreating the effect dependencies
  const shouldInitialize = useMemo(() => 
    !isInitialized && !authLoading && isAuthenticated, 
    [isInitialized, authLoading, isAuthenticated]
  );

  useEffect(() => {
    const initializeData = async () => {
      if (!shouldInitialize) {
        return;
      }
      
      console.log("BookingContext: Initializing data");
      await refreshData();
      setIsInitialized(true);
    };

    initializeData();
  }, [shouldInitialize, refreshData]);

  // Reset when auth changes
  useEffect(() => {
    if (authLoading) {
      setIsInitialized(false);
    } else if (!isAuthenticated) {
      console.log("BookingContext: Not authenticated, stopping loading");
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, [authLoading, isAuthenticated]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    bookings,
    setBookings,
    instruments,
    addInstrument,
    updateInstrument,
    deleteInstrument,
    deleteBooking,
    createBooking,
    updateBooking,
    applyDelay,
    statistics,
    addCommentToBooking,
    deleteCommentFromBooking,
    getStatusColor,
    isLoading,
    refreshData
  }), [
    bookings,
    setBookings,
    instruments,
    addInstrument,
    updateInstrument,
    deleteInstrument,
    deleteBooking,
    createBooking,
    updateBooking,
    applyDelay,
    statistics,
    addCommentToBooking,
    deleteCommentFromBooking,
    getStatusColor,
    isLoading,
    refreshData,
    refreshKey // Include refresh key to force updates when needed
  ]);

  return (
    <BookingContext.Provider value={contextValue}>
      {children}
    </BookingContext.Provider>
  );
};

export const useBooking = () => useContext(BookingContext);
