import React, { useState, useEffect, useMemo } from "react";
import { useOptimizedBooking } from "../../contexts/OptimizedBookingContext";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { toast } from "sonner";
import { format } from "date-fns";
import { Loader2, CalendarIcon, Clock } from "lucide-react";
import { cn } from "../../lib/utils";
import { Booking, Comment } from "../../types";
import BookingComments from "./BookingComments";
import { findBookingConflict, describeConflict } from "../../utils/bookingOverlap";
import { useAppSettings } from "../../hooks/useAppSettings";
import { getBookingWindowEnd } from "../../utils/bookingWindow";
import SequenceFileUpload from "./SequenceFileUpload";

interface EditBookingFormProps {
  booking: Booking | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (data: Partial<Booking>) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

const EditBookingForm: React.FC<EditBookingFormProps> = ({
  booking,
  open,
  onOpenChange,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  const { instruments, updateBooking, bookings, refreshData } = useOptimizedBooking();
  const { user } = useAuth();
  const { settings: appSettings } = useAppSettings();
  const [comments, setComments] = useState<Comment[]>([]);
  // Local override for the sequence file display so the UI updates
  // immediately after upload/remove without waiting for refreshData() to
  // propagate a new booking prop.
  const [sequenceFileOverride, setSequenceFileOverride] = useState<{
    name: string | null;
    size: number | null;
  } | null>(null);
  const [formData, setFormData] = useState({
    instrumentId: "",
    instrumentName: "",
    selectedDate: new Date(),
    selectedTime: "09:00",
    duration: "1",
    purpose: "",
    details: "",
    status: "pending" as const,
    sampleNumber: "",
    sampleRunTime: ""
  });

  const maxBookingDate = useMemo(() => {
    return getBookingWindowEnd(appSettings) ?? new Date(8640000000000000);
  }, [appSettings]);

  // Generate time options in 30-minute increments for 24 hours
  const timeOptions = Array.from({ length: 48 }, (_, i) => {
    const hour = Math.floor(i / 2);
    const minute = i % 2 === 0 ? "00" : "30";
    const timeStr = `${hour.toString().padStart(2, '0')}:${minute}`;
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const ampm = hour < 12 ? "AM" : "PM";
    const displayTime = `${hour12}:${minute} ${ampm}`;
    return { value: timeStr, display: displayTime };
  });

  // Initialize form when booking changes
  useEffect(() => {
    if (booking && user) {
      console.log("Initializing edit form with booking:", booking);
      setSequenceFileOverride(null);

      const startDate = new Date(booking.start);
      const endDate = new Date(booking.end);
      const startTime = format(startDate, "HH:mm");
      
      // Calculate duration in hours
      const durationMs = endDate.getTime() - startDate.getTime();
      const durationHours = durationMs / (1000 * 60 * 60);
      
      // Extract sample information from details if available
      let sampleNumber = "";
      let sampleRunTime = "";
      
      if (booking.details) {
        const sampleMatch = booking.details.match(/Total Samples: (\d+)/);
        const runtimeMatch = booking.details.match(/Run Time per Sample: ([0-9.]+) minutes/);
        
        if (sampleMatch) sampleNumber = sampleMatch[1];
        if (runtimeMatch) sampleRunTime = runtimeMatch[1];
      }
      
      setFormData({
        instrumentId: booking.instrumentId,
        instrumentName: booking.instrumentName,
        selectedDate: startDate,
        selectedTime: startTime,
        duration: durationHours.toString(),
        purpose: booking.purpose,
        details: booking.details || "",
        status: booking.status as any,
        sampleNumber,
        sampleRunTime
      });
      
      setComments(booking.comments || []);
    }
  }, [booking, user]);

  // Auto-calculate duration when sample data changes
  useEffect(() => {
    console.log("Duration calculation triggered:", { 
      sampleNumber: formData.sampleNumber, 
      sampleRunTime: formData.sampleRunTime 
    });
    
    if (formData.sampleNumber && formData.sampleRunTime) {
      const totalSamples = parseInt(formData.sampleNumber);
      const runTimePerSample = parseFloat(formData.sampleRunTime);
      
      console.log("Parsed values:", { totalSamples, runTimePerSample });
      
      if (totalSamples > 0 && runTimePerSample > 0) {
        // Calculate total runtime + 15 minutes setup time
        const totalMinutes = (totalSamples * runTimePerSample) + 15;
        const totalHours = totalMinutes / 60;
        const roundedHours = Math.ceil(totalHours * 2) / 2; // Round to nearest 0.5 hours
        
        console.log("Calculated duration:", { totalMinutes, totalHours, roundedHours });
        
        setFormData(prev => ({ ...prev, duration: roundedHours.toString() }));
      }
    }
  }, [formData.sampleNumber, formData.sampleRunTime]);

  // Calculate end date/time - Fixed to handle durations longer than 24 hours
  const calculateEndDateTime = () => {
    const [hours, minutes] = formData.selectedTime.split(':').map(Number);
    const startDate = new Date(formData.selectedDate);
    startDate.setHours(hours, minutes, 0, 0);
    
    const endDate = new Date(startDate);
    const durationHours = parseFloat(formData.duration);
    
    // Handle durations longer than 24 hours by adding days
    const totalMinutes = durationHours * 60;
    endDate.setTime(startDate.getTime() + totalMinutes * 60 * 1000);
    
    return endDate;
  };

  // Handle sample number change
  const handleSampleNumberChange = (value: string) => {
    console.log("Sample number changed:", value);
    setFormData(prev => ({ ...prev, sampleNumber: value }));
  };

  // Handle sample run time change
  const handleSampleRunTimeChange = (value: string) => {
    console.log("Sample run time changed:", value);
    setFormData(prev => ({ ...prev, sampleRunTime: value }));
  };

  // Handle duration change (both from select and direct input)
  const handleDurationChange = (value: string) => {
    setFormData(prev => ({ ...prev, duration: value }));
  };

  // Check if duration is a predefined option
  const predefinedDurations = ["0.5", "1", "1.5", "2", "3", "4", "6", "8"];
  const isCustomDuration = !predefinedDurations.includes(formData.duration);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!booking || !user) {
      console.error("Missing booking or user data");
      toast.error("Missing required information");
      return;
    }

    console.log("Starting booking update process...");

    try {
      const [hours, minutes] = formData.selectedTime.split(':').map(Number);
      const startDate = new Date(formData.selectedDate);
      startDate.setHours(hours, minutes, 0, 0);
      
      const endDate = calculateEndDateTime();

      // Frontend overlap check (skip if this booking is being cancelled/denied)
      const newStatus = (formData.status || "").toLowerCase();
      if (newStatus !== "cancelled" && newStatus !== "denied") {
        const conflict = findBookingConflict({
          bookings,
          instrumentId: formData.instrumentId,
          start: startDate,
          end: endDate,
          excludeBookingId: booking.id,
        });
        if (conflict) {
          toast.error(describeConflict(conflict));
          return;
        }
      }

      // Build details with sample information
      let detailsText = formData.details.replace(/\n\nSample Information:[\s\S]*$/, '');
      if (formData.sampleNumber && formData.sampleRunTime) {
        detailsText += `\n\nSample Information:`;
        detailsText += `\n- Total Samples: ${formData.sampleNumber}`;
        detailsText += `\n- Run Time per Sample: ${formData.sampleRunTime} minutes`;
        detailsText += `\n- Calculated Duration: ${formData.duration} hours`;
      } else if (formData.sampleNumber) {
        detailsText += `\n\nSample Number: ${formData.sampleNumber}`;
      }

      const updatedBooking: Booking = {
        ...booking,
        instrumentId: formData.instrumentId,
        instrumentName: formData.instrumentName,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        purpose: formData.purpose,
        details: detailsText,
        status: formData.status,
        comments: comments
      };

      console.log("Updating booking with data:", updatedBooking);
      
      if (onSubmit) {
        console.log("Using custom onSubmit handler");
        await onSubmit(updatedBooking);
      } else {
        console.log("Using default updateBooking method");
        await updateBooking(updatedBooking);
        toast.success("Booking updated successfully");
      }
      
      console.log("Booking update completed successfully");
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving booking:", error);
      const rawMessage = error instanceof Error ? error.message : "Failed to save changes";
      const errorMessage = rawMessage.toLowerCase().includes("booking conflict")
        ? "This instrument is already booked during the selected time window."
        : rawMessage;
      toast.error(errorMessage);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    onOpenChange(false);
  };

  // Return null until we have booking data
  if (!booking || !user) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>Edit Booking</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="instrument">Instrument</Label>
            <Select
              value={formData.instrumentId}
              onValueChange={(value) => {
                const instrument = instruments.find(i => i.id === value);
                setFormData(prev => ({ 
                  ...prev, 
                  instrumentId: value,
                  instrumentName: instrument?.name || ""
                }));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an instrument" />
              </SelectTrigger>
              <SelectContent>
                {instruments.map(instrument => (
                  <SelectItem key={instrument.id} value={instrument.id}>
                    {instrument.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="date">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.selectedDate ? format(formData.selectedDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.selectedDate}
                  onSelect={(date) => date && setFormData(prev => ({ ...prev, selectedDate: date }))}
                  disabled={(date) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return date < today || date > maxBookingDate;
                  }}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label htmlFor="time">Start Time</Label>
            <Select
              value={formData.selectedTime}
              onValueChange={(value) => setFormData(prev => ({ ...prev, selectedTime: value }))}
            >
              <SelectTrigger>
                <Clock className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto">
                {timeOptions.map((time) => (
                  <SelectItem key={time.value} value={time.value}>
                    {time.display}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="sampleNumber">Total Samples</Label>
              <Input
                id="sampleNumber"
                type="number"
                value={formData.sampleNumber}
                onChange={(e) => handleSampleNumberChange(e.target.value)}
                placeholder="Number of samples"
                min="1"
              />
            </div>
            <div>
              <Label htmlFor="sampleRunTime">Run Time (min/sample)</Label>
              <Input
                id="sampleRunTime"
                type="number"
                step="0.1"
                value={formData.sampleRunTime}
                onChange={(e) => handleSampleRunTimeChange(e.target.value)}
                placeholder="Minutes per sample"
                min="0.1"
              />
            </div>
          </div>

          {formData.sampleNumber && formData.sampleRunTime && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Auto-calculated:</strong> {formData.sampleNumber} samples × {formData.sampleRunTime} min + 15 min setup = {formData.duration} hours total
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="duration">Duration (hours)</Label>
            {isCustomDuration ? (
              <div className="space-y-2">
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={formData.duration}
                  onChange={(e) => handleDurationChange(e.target.value)}
                  placeholder="Enter duration in hours"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData(prev => ({ ...prev, duration: "1" }))}
                >
                  Use predefined durations
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Select
                  value={formData.duration}
                  onValueChange={handleDurationChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0.5">30 minutes</SelectItem>
                    <SelectItem value="1">1 hour</SelectItem>
                    <SelectItem value="1.5">1.5 hours</SelectItem>
                    <SelectItem value="2">2 hours</SelectItem>
                    <SelectItem value="3">3 hours</SelectItem>
                    <SelectItem value="4">4 hours</SelectItem>
                    <SelectItem value="6">6 hours</SelectItem>
                    <SelectItem value="8">8 hours</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData(prev => ({ ...prev, duration: "12" }))}
                >
                  Enter custom duration
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Duration is auto-calculated when both sample fields are filled
            </p>
          </div>

          {formData.selectedDate && formData.selectedTime && formData.duration && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-800">
                <strong>End Time:</strong> {format(calculateEndDateTime(), "PPP 'at' p")}
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="purpose">Purpose</Label>
            <Input
              id="purpose"
              value={formData.purpose}
              onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
              placeholder="Brief description of the purpose"
              required
            />
          </div>

          <div>
            <Label htmlFor="details">Additional Details (Optional)</Label>
            <Textarea
              id="details"
              value={formData.details}
              onChange={(e) => setFormData(prev => ({ ...prev, details: e.target.value }))}
              placeholder="Any additional details or special requirements"
              className="min-h-[80px]"
            />
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as any }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Not-Started">Not Started</SelectItem>
                <SelectItem value="In-Progress">In Progress</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Delayed">Delayed</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {appSettings?.s3_uploads_enabled && (
            <SequenceFileUpload
              bookingId={booking.id}
              bookingOwnerId={booking.userId}
              existingFileName={
                sequenceFileOverride
                  ? sequenceFileOverride.name
                  : booking.sequenceFileName
              }
              existingFileSize={
                sequenceFileOverride
                  ? sequenceFileOverride.size
                  : booking.sequenceFileSize
              }
              onUploaded={(info) => {
                setSequenceFileOverride({ name: info.name, size: info.size });
                refreshData();
              }}
              onRemoved={() => {
                setSequenceFileOverride({ name: null, size: null });
                refreshData();
              }}
              disabled={isSubmitting}
            />
          )}

          <BookingComments
            bookingId={booking.id}
            comments={comments}
            onCommentsChange={setComments}
          />

          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting || !formData.purpose.trim()}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditBookingForm;
