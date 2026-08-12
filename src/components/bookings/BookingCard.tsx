
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Calendar, Clock, FileText, MessageCircle, Loader2, Trash2, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
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
import SequenceFileLink from "../calendar/SequenceFileLink";

interface BookingCardProps {
  booking: any;
  user: any;
  commentContent: string;
  addingComment: boolean;
  deletingBooking: boolean;
  deletingComment: { [key: string]: boolean };
  onCommentContentChange: (value: string) => void;
  onAddComment: () => void;
  onDeleteComment: (commentId: string) => void;
  onDeleteBooking: () => void;
}

const getStatusVariant = (status: string) => {
  switch (status) {
    case "confirmed":
      return "default";
    case "pending":
      return "secondary";
    case "In-Progress":
      return "secondary";
    case "Completed":
      return "outline";
    case "cancelled":
      return "destructive";
    case "Delayed":
      return "secondary";
    default:
      return "outline";
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case "pending":
      return "Pending Approval";
    default:
      return status;
  }
};

export const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  user,
  commentContent,
  addingComment,
  deletingBooking,
  deletingComment,
  onCommentContentChange,
  onAddComment,
  onDeleteComment,
  onDeleteBooking,
}) => (
  <Card className="mb-4">
    <CardHeader>
      <div className="flex justify-between items-start">
        <div>
          <CardTitle className="text-lg">{booking.instrumentName}</CardTitle>
          <CardDescription className="flex items-center gap-2 mt-1">
            <Calendar className="h-4 w-4" />
            {format(new Date(booking.start), "PPP")}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={getStatusVariant(booking.status)}>
            {getStatusText(booking.status)}
          </Badge>
          {user?.role === "admin" && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  disabled={deletingBooking}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Booking</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this booking for {booking.instrumentName}? 
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deletingBooking}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onDeleteBooking}
                    disabled={deletingBooking}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {deletingBooking ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      "Delete Booking"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        {format(new Date(booking.start), "p")} - {format(new Date(booking.end), "p")}
      </div>
      
      {booking.purpose && (
        <div className="flex items-start gap-2 text-sm">
          <FileText className="h-4 w-4 mt-0.5" />
          <span><strong>Purpose:</strong> {booking.purpose}</span>
        </div>
      )}
      
      {booking.details && (
        <div className="text-sm">
          <strong>Details:</strong> {booking.details}
        </div>
      )}

      {booking.sequenceFileKey && booking.sequenceFileName && (
        <div className="flex items-center gap-2 text-sm">
          <strong>Sequence:</strong>
          <SequenceFileLink
            bookingId={booking.id}
            fileName={booking.sequenceFileName}
            canEdit={!!user && (user.id === booking.userId || user.role === "admin")}
          />
        </div>
      )}

      {booking.status === "pending" && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm text-yellow-800">
            <strong>Pending Approval:</strong> This booking is waiting for administrator approval.
          </p>
        </div>
      )}

      {/* Comments section */}
      {booking.comments && booking.comments.length > 0 && (
        <div className="border-t pt-3">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
            <MessageCircle className="h-4 w-4" />
            Comments ({booking.comments.length})
          </h4>
          <div className="space-y-2">
            {booking.comments.map((comment: any) => (
              <div key={comment.id} className="bg-muted p-2 rounded text-sm">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium">{comment.userName}</div>
                    <div className="text-muted-foreground">{comment.content}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {format(new Date(comment.createdAt), "PPp")}
                    </div>
                  </div>
                  {comment.userId === user?.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 ml-2"
                      onClick={() => onDeleteComment(comment.id)}
                      disabled={deletingComment[comment.id]}
                    >
                      {deletingComment[comment.id] ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add comment section */}
      <div className="border-t pt-3">
        <div className="space-y-2">
          <Textarea
            placeholder="Add a comment..."
            value={commentContent}
            onChange={(e) => onCommentContentChange(e.target.value)}
            className="min-h-[60px]"
          />
          <Button
            size="sm"
            onClick={onAddComment}
            disabled={!commentContent.trim() || addingComment}
          >
            {addingComment ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              "Add Comment"
            )}
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
);
