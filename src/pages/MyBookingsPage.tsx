import React, { useMemo, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useOptimizedBooking } from "../contexts/OptimizedBookingContext";
import { Card, CardContent } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Calendar, Clock, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BookingCard } from "../components/bookings/BookingCard";
import { BookingSearch } from "../components/bookings/BookingSearch";
import { BookingSortDropdown, SortOption } from "../components/bookings/BookingSortDropdown";
import { Booking } from "../types";

const MyBookingsPage: React.FC = () => {
  const { user } = useAuth();
  const { bookings, isLoading, addCommentToBooking, deleteBooking, deleteCommentFromBooking } = useOptimizedBooking();
  const [commentContent, setCommentContent] = useState<{ [key: string]: string }>({});
  const [addingComment, setAddingComment] = useState<{ [key: string]: boolean }>({});
  const [deletingBooking, setDeletingBooking] = useState<{ [key: string]: boolean }>({});
  const [deletingComment, setDeletingComment] = useState<{ [key: string]: boolean }>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest-first");

  // Filter bookings for the current user
  const userBookings = useMemo(() => {
    if (!user) return [];
    return bookings.filter(booking => booking.userId === user.id);
  }, [bookings, user]);

  // Search and sort bookings
  const filteredAndSortedBookings = useMemo(() => {
    let filtered = userBookings;

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = userBookings.filter(booking => 
        booking.purpose?.toLowerCase().includes(searchLower) ||
        booking.details?.toLowerCase().includes(searchLower) ||
        booking.instrumentName?.toLowerCase().includes(searchLower) ||
        booking.comments?.some(comment => 
          comment.content?.toLowerCase().includes(searchLower)
        )
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "newest-first":
          return new Date(b.start).getTime() - new Date(a.start).getTime();
        case "oldest-first":
          return new Date(a.start).getTime() - new Date(b.start).getTime();
        case "title-asc":
          return (a.purpose || "").localeCompare(b.purpose || "");
        case "title-desc":
          return (b.purpose || "").localeCompare(a.purpose || "");
        case "instrument-asc":
          return (a.instrumentName || "").localeCompare(b.instrumentName || "");
        case "instrument-desc":
          return (b.instrumentName || "").localeCompare(a.instrumentName || "");
        default:
          return new Date(b.start).getTime() - new Date(a.start).getTime();
      }
    });

    return sorted;
  }, [userBookings, searchTerm, sortBy]);

  // Categorize filtered and sorted bookings
  const categorizedBookings = useMemo(() => {
    const now = new Date();
    
    const upcoming = filteredAndSortedBookings.filter(booking => {
      const startTime = new Date(booking.start);
      return startTime > now && booking.status !== "Completed" && booking.status !== "cancelled";
    });

    const current = filteredAndSortedBookings.filter(booking => {
      const startTime = new Date(booking.start);
      const endTime = new Date(booking.end);
      return (startTime <= now && endTime >= now && booking.status === "In-Progress") || 
             booking.status === "Delayed";
    });

    const past = filteredAndSortedBookings.filter(booking => {
      const endTime = new Date(booking.end);
      return (endTime < now || booking.status === "Completed" || booking.status === "cancelled") && 
             booking.status !== "Delayed";
    });

    return { upcoming, current, past };
  }, [filteredAndSortedBookings]);

  const handleCommentContentChange = useCallback((bookingId: string, value: string) => {
    setCommentContent(prev => ({ ...prev, [bookingId]: value }));
  }, []);

  const handleAddComment = useCallback(async (bookingId: string) => {
    const content = commentContent[bookingId]?.trim();
    if (!content || !user) return;

    setAddingComment(prev => ({ ...prev, [bookingId]: true }));
    
    try {
      await addCommentToBooking(bookingId, {
        userId: user.id,
        userName: user.name,
        content,
        createdAt: new Date().toISOString()
      });
      
      setCommentContent(prev => ({ ...prev, [bookingId]: "" }));
      toast.success("Comment added successfully");
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment");
    } finally {
      setAddingComment(prev => ({ ...prev, [bookingId]: false }));
    }
  }, [commentContent, user, addCommentToBooking]);

  const handleDeleteComment = useCallback(async (bookingId: string, commentId: string) => {
    setDeletingComment(prev => ({ ...prev, [commentId]: true }));
    
    try {
      await deleteCommentFromBooking(bookingId, commentId);
      toast.success("Comment deleted successfully");
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error("Failed to delete comment");
    } finally {
      setDeletingComment(prev => ({ ...prev, [commentId]: false }));
    }
  }, [deleteCommentFromBooking]);

  const handleDeleteBooking = useCallback(async (bookingId: string) => {
    setDeletingBooking(prev => ({ ...prev, [bookingId]: true }));
    
    try {
      await deleteBooking(bookingId);
      toast.success("Booking deleted successfully");
    } catch (error) {
      console.error("Error deleting booking:", error);
      toast.error("Failed to delete booking");
    } finally {
      setDeletingBooking(prev => ({ ...prev, [bookingId]: false }));
    }
  }, [deleteBooking]);

  if (!user) {
    return (
      <div className="container py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Please log in to view your bookings</h1>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-7xl flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-mslab-400" />
        <span className="ml-2 text-lg text-mslab-400">Loading your bookings...</span>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Bookings</h1>
        <p className="text-muted-foreground">
          View and manage your laboratory instrument bookings
        </p>
      </div>

      {/* Search and Sort Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 max-w-md">
          <BookingSearch
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
        </div>
        <BookingSortDropdown
          sortBy={sortBy}
          onSortChange={setSortBy}
        />
      </div>

      <Tabs defaultValue="upcoming" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming ({categorizedBookings.upcoming.length})
          </TabsTrigger>
          <TabsTrigger value="current">
            Current ({categorizedBookings.current.length})
          </TabsTrigger>
          <TabsTrigger value="past">
            Past ({categorizedBookings.past.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          {categorizedBookings.upcoming.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">
                  {searchTerm ? "No matching upcoming bookings" : "No upcoming bookings"}
                </h3>
                <p className="text-muted-foreground">
                  {searchTerm 
                    ? "Try adjusting your search term to find bookings." 
                    : "You don't have any upcoming instrument bookings scheduled."
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            categorizedBookings.upcoming.map(booking => (
              <BookingCard
                key={booking.id}
                booking={booking}
                user={user}
                commentContent={commentContent[booking.id] || ""}
                addingComment={addingComment[booking.id] || false}
                deletingBooking={deletingBooking[booking.id] || false}
                deletingComment={deletingComment}
                onCommentContentChange={(value) => handleCommentContentChange(booking.id, value)}
                onAddComment={() => handleAddComment(booking.id)}
                onDeleteComment={(commentId) => handleDeleteComment(booking.id, commentId)}
                onDeleteBooking={() => handleDeleteBooking(booking.id)}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="current" className="space-y-4">
          {categorizedBookings.current.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">
                  {searchTerm ? "No matching current bookings" : "No current bookings"}
                </h3>
                <p className="text-muted-foreground">
                  {searchTerm 
                    ? "Try adjusting your search term to find bookings." 
                    : "You don't have any instruments currently in use."
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            categorizedBookings.current.map(booking => (
              <BookingCard
                key={booking.id}
                booking={booking}
                user={user}
                commentContent={commentContent[booking.id] || ""}
                addingComment={addingComment[booking.id] || false}
                deletingBooking={deletingBooking[booking.id] || false}
                deletingComment={deletingComment}
                onCommentContentChange={(value) => handleCommentContentChange(booking.id, value)}
                onAddComment={() => handleAddComment(booking.id)}
                onDeleteComment={(commentId) => handleDeleteComment(booking.id, commentId)}
                onDeleteBooking={() => handleDeleteBooking(booking.id)}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-4">
          {categorizedBookings.past.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">
                  {searchTerm ? "No matching past bookings" : "No past bookings"}
                </h3>
                <p className="text-muted-foreground">
                  {searchTerm 
                    ? "Try adjusting your search term to find bookings." 
                    : "Your completed bookings will appear here."
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            categorizedBookings.past.map(booking => (
              <BookingCard
                key={booking.id}
                booking={booking}
                user={user}
                commentContent={commentContent[booking.id] || ""}
                addingComment={addingComment[booking.id] || false}
                deletingBooking={deletingBooking[booking.id] || false}
                deletingComment={deletingComment}
                onCommentContentChange={(value) => handleCommentContentChange(booking.id, value)}
                onAddComment={() => handleAddComment(booking.id)}
                onDeleteComment={(commentId) => handleDeleteComment(booking.id, commentId)}
                onDeleteBooking={() => handleDeleteBooking(booking.id)}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MyBookingsPage;
