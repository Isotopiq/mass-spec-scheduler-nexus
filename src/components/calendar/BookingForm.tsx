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
import { findBookingConflict, describeConflict } from "../../utils/bookingOverlap";
import { useAppSettings } from "../../hooks/useAppSettings";
import SequenceFileUpload from "./SequenceFileUpload";
import { supabase, SUPABASE_FUNCTIONS_URL } from "../../integrations/supabase/client";

interface BookingFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate?: Date;
  selectedTime?: string;
  instrumentId?: string;
}

const BookingForm: React.FC<BookingFormProps> = ({
  open,
  onOpenChange,
  selectedDate,
  selectedTime = "09:00",
  instrumentId
}) => {
  const { createBooking, instruments, bookings } = useOptimizedBooking();
  const { user } = useAuth();
  const { settings: appSettings } = useAppSettings();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isJoiningWaitlist, setIsJoiningWaitlist] = useState(false);
  const [showWaitlistOffer, setShowWaitlistOffer] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    selectedInstrument: instrumentId || "",
    selectedDate: selectedDate || new Date(),
    selectedTime: selectedTime,
    duration: "1",
    purpose: "",
    details: "",
    sampleNumber: "",
    sampleRunTime: ""
  });

  const selectedInstrument = instruments.find(i => i.id === formData.selectedInstrument);

  const maxBookingDate = useMemo(() => {
    const days = appSettings?.max_booking_days_ahead ?? 365;
    const max = new Date();
    max.setHours(0, 0, 0, 0);
    max.setDate(max.getDate() + days);
    max.setHours(23, 59, 59, 999);
    return max;
  }, [appSettings?.max_booking_days_ahead]);

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

  // Calculate end date/time
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
    if (!user || !selectedInstrument) {
      console.error("Missing user or instrument data");
      toast.error("Missing required information");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const [hours, minutes] = formData.selectedTime.split(':').map(Number);
      const startDate = new Date(formData.selectedDate);
      startDate.setHours(hours, minutes, 0, 0);
      
      const endDate = calculateEndDateTime();

      // Frontend overlap check for immediate feedback
      const conflict = findBookingConflict({
        bookings,
        instrumentId: selectedInstrument.id,
        start: startDate,
        end: endDate,
      });
      if (conflict) {
        toast.error(describeConflict(conflict));
        setShowWaitlistOffer(true);
        setIsSubmitting(false);
        return;
      }

      setShowWaitlistOffer(false);

      // Always set status as pending for new bookings
      const initialStatus = "pending";

      // Build details with sample information
      let detailsText = formData.details;
      if (formData.sampleNumber && formData.sampleRunTime) {
        detailsText += `\n\nSample Information:`;
        detailsText += `\n- Total Samples: ${formData.sampleNumber}`;
        detailsText += `\n- Run Time per Sample: ${formData.sampleRunTime} minutes`;
        detailsText += `\n- Calculated Duration: ${formData.duration} hours`;
      } else if (formData.sampleNumber) {
        detailsText += `\n\nSample Number: ${formData.sampleNumber}`;
      }

      console.log("Submitting booking with data:", {
        userId: user.id,
        userName: user.name,
        instrumentId: selectedInstrument.id,
        instrumentName: selectedInstrument.name,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        purpose: formData.purpose,
        details: detailsText,
        status: initialStatus,
        comments: []
      });

      const created = await createBooking({
        userId: user.id,
        userName: user.name,
        instrumentId: selectedInstrument.id,
        instrumentName: selectedInstrument.name,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        purpose: formData.purpose,
        details: detailsText,
        status: initialStatus,
        comments: []
      });

      // Upload sequence file if one was picked
      if (pendingFile && created?.id) {
        try {
          const form = new FormData();
          form.append("file", pendingFile);
          form.append("bookingId", created.id);
          const { data: sess } = await supabase.auth.getSession();
          const token = sess.session?.access_token;
          const resp = await fetch(
            `${SUPABASE_FUNCTIONS_URL}/s3-upload-sequence`,
            { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form }
          );
          const json = await resp.json();
          if (!resp.ok) throw new Error(json.error || "Upload failed");
          toast.success("Booking submitted and sequence file uploaded");
        } catch (uploadErr) {
          console.error("Sequence upload failed", uploadErr);
          toast.error(
            "Booking created, but sequence file upload failed: " +
              (uploadErr instanceof Error ? uploadErr.message : "unknown error")
          );
        }
      } else {
        toast.success("Booking request submitted for admin approval");
      }

      onOpenChange(false);
      // Reset form
      setPendingFile(null);
      setFormData({
        selectedInstrument: "",
        selectedDate: new Date(),
        selectedTime: "09:00",
        duration: "1",
        purpose: "",
        details: "",
        sampleNumber: "",
        sampleRunTime: ""
      });
    } catch (error: any) {
      console.error("Error creating booking:", error);
      const msg = (error?.message || "").toString();
      if (msg.toLowerCase().includes("booking conflict")) {
        toast.error("This instrument is already booked during the selected time window.");
      } else {
        toast.error("Failed to create booking. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinWaitlist = async () => {
    if (!user || !selectedInstrument) return;
    setIsJoiningWaitlist(true);
    try {
      const [hours, minutes] = formData.selectedTime.split(':').map(Number);
      const startDate = new Date(formData.selectedDate);
      startDate.setHours(hours, minutes, 0, 0);
      const endDate = calculateEndDateTime();

      const { error } = await supabase.from('booking_waitlist').insert({
        instrument_id: selectedInstrument.id,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        purpose: formData.purpose || 'Waitlist request',
        details: formData.details
      });

      if (error) throw error;
      toast.success('Added to waitlist. You will be notified if the slot becomes available.');
      setShowWaitlistOffer(false);
      onOpenChange(false);
      setFormData({
        selectedInstrument: instrumentId || "",
        selectedDate: selectedDate || new Date(),
        selectedTime: selectedTime,
        duration: "1",
        purpose: "",
        details: "",
        sampleNumber: "",
        sampleRunTime: ""
      });
    } catch (error: any) {
      console.error('Error joining waitlist:', error);
      toast.error(error?.message || 'Failed to join waitlist.');
    } finally {
      setIsJoiningWaitlist(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>Create New Booking</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="instrument">Instrument</Label>
            <Select
              value={formData.selectedInstrument}
              onValueChange={(value) => setFormData(prev => ({ ...prev, selectedInstrument: value }))}
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

          {appSettings?.s3_uploads_enabled && (
            <SequenceFileUpload
              bookingId={null}
              onLocalFilePicked={setPendingFile}
              disabled={isSubmitting}
            />
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Your booking will be submitted for admin approval and will be pending until confirmed.
            </p>
          </div>

          {showWaitlistOffer && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-3">
              <p className="text-sm text-amber-800">
                This slot is currently booked. You can join the waitlist to be notified and auto-booked if it becomes available.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={handleJoinWaitlist}
                disabled={isJoiningWaitlist}
                className="w-full"
              >
                {isJoiningWaitlist ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Joining...
                  </>
                ) : (
                  'Join Waitlist'
                )}
              </Button>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting || !formData.purpose.trim() || !formData.selectedInstrument}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit for Approval"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
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

export default BookingForm;
