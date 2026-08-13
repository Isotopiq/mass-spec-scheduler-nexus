import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Button } from "../ui/button";
import { useBookingSwaps } from "../../hooks/useBookingSwaps";
import { format } from "date-fns";
import { toast } from "sonner";

interface SwapRequestDialogProps {
  bookingId: string;
  children: React.ReactNode;
  onRequested?: () => void;
}

export const SwapRequestDialog: React.FC<SwapRequestDialogProps> = ({
  bookingId,
  children,
  onRequested,
}) => {
  const [open, setOpen] = useState(false);
  const [eligible, setEligible] = useState<any[]>([]);
  const [selected, setSelected] = useState<string>("");
  const { fetchEligibleSwaps, requestSwap, isLoading } = useBookingSwaps();

  const loadEligible = useCallback(async () => {
    try {
      const data = await fetchEligibleSwaps(bookingId);
      setEligible(data);
    } catch (error) {
      console.error("Failed to load eligible swaps", error);
      toast.error("Failed to load eligible bookings");
    }
  }, [bookingId, fetchEligibleSwaps]);

  useEffect(() => {
    if (open) {
      setSelected("");
      loadEligible();
    }
  }, [open, loadEligible]);

  const handleRequest = async () => {
    if (!selected) return;
    try {
      await requestSwap(bookingId, selected);
      toast.success("Swap request sent");
      setOpen(false);
      onRequested?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send swap request";
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Swap</DialogTitle>
          <DialogDescription>
            Select another booking to swap instrument and time slots with.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {eligible.length === 0 ? (
            <p className="text-sm text-muted-foreground">No eligible bookings found to swap with.</p>
          ) : (
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a booking to swap with" />
              </SelectTrigger>
              <SelectContent>
                {eligible.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.instrument_name} - {b.user_name} - {" "}
                    {format(new Date(b.start_time), "PP p")} to {" "}
                    {format(new Date(b.end_time), "p")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleRequest} disabled={!selected || isLoading}>
            {isLoading ? "Sending..." : "Request Swap"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
