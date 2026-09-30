import React, { useState, useEffect, useCallback } from "react";
import { useBookingSwaps } from "../../hooks/useBookingSwaps";
import { BookingSwap } from "../../types";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { Textarea } from "../ui/textarea";
import { format } from "date-fns";
import { toast } from "sonner";

export const SwapRequestsManagement: React.FC = () => {
  const [swaps, setSwaps] = useState<BookingSwap[]>([]);
  const [activeTab, setActiveTab] = useState("pending");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const { fetchSwaps, adminReviewSwap, respondToSwap, isLoading } = useBookingSwaps();

  const load = useCallback(async () => {
    try {
      const status = activeTab === "all" ? undefined : activeTab;
      const data = await fetchSwaps(status);
      setSwaps(data);
    } catch (error) {
      console.error("Failed to load swap requests", error);
      toast.error("Failed to load swap requests");
    }
  }, [activeTab, fetchSwaps]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdminAction = async (swapId: string, status: string, existingNotes?: string) => {
    try {
      const adminNotes = notes[swapId] !== undefined ? notes[swapId] : existingNotes;
      await adminReviewSwap(swapId, status, adminNotes);
      toast.success(`Swap request ${status}`);
      setNotes((prev) => ({ ...prev, [swapId]: "" }));
      load();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update swap";
      toast.error(message);
    }
  };

  const handleRespond = async (swapId: string, response: "accept" | "decline") => {
    try {
      await respondToSwap(swapId, response);
      toast.success(`Swap ${response}ed`);
      load();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to respond";
      toast.error(message);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "approved":
        return "default";
      case "pending":
      case "accepted":
        return "secondary";
      case "declined":
      case "denied":
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Booking Swap Requests</h3>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pending" onClick={() => setActiveTab("pending")}>Pending</TabsTrigger>
            <TabsTrigger value="accepted" onClick={() => setActiveTab("accepted")}>Accepted</TabsTrigger>
            <TabsTrigger value="approved" onClick={() => setActiveTab("approved")}>Approved</TabsTrigger>
            <TabsTrigger value="denied" onClick={() => setActiveTab("denied")}>Denied</TabsTrigger>
            <TabsTrigger value="all" onClick={() => setActiveTab("all")}>All</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}

      {!isLoading && swaps.length === 0 && (
        <p className="text-sm text-muted-foreground">No swap requests found.</p>
      )}

      <div className="space-y-4">
        {swaps.map((swap) => (
          <div key={swap.id} className="border rounded-lg p-4 bg-card">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{swap.requesterInstrumentName}</span>
                  <span className="text-muted-foreground">↔</span>
                  <span className="font-medium">{swap.recipientInstrumentName}</span>
                  <Badge variant={getStatusVariant(swap.status)}>{swap.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {swap.requesterName} → {swap.recipientName} ·{" "}
                  {swap.requestedAt ? format(new Date(swap.requestedAt), "PP p") : ""}
                </p>
                <div className="text-sm space-y-0.5">
                  <p>
                    <strong>Offered slot:</strong>{" "}
                    {swap.requesterInstrumentName} at{" "}
                    {swap.requesterStart ? format(new Date(swap.requesterStart), "PP p") : ""} -{" "}
                    {swap.requesterEnd ? format(new Date(swap.requesterEnd), "p") : ""}
                  </p>
                  <p>
                    <strong>Requested slot:</strong>{" "}
                    {swap.recipientInstrumentName} at{" "}
                    {swap.recipientStart ? format(new Date(swap.recipientStart), "PP p") : ""} -{" "}
                    {swap.recipientEnd ? format(new Date(swap.recipientEnd), "p") : ""}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Textarea
                  placeholder="Admin notes (optional)"
                  value={notes[swap.id] ?? swap.adminNotes ?? ""}
                  onChange={(e) => setNotes((prev) => ({ ...prev, [swap.id]: e.target.value }))}
                  className="min-h-[60px]"
                />
                <div className="flex flex-wrap gap-2">
                  {swap.status === "pending" && (
                    <>
                      <Button size="sm" onClick={() => handleRespond(swap.id, "accept")}>
                        Accept (as recipient)
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleRespond(swap.id, "decline")}>
                        Decline
                      </Button>
                    </>
                  )}
                  {(swap.status === "pending" || swap.status === "accepted") && (
                    <>
                      <Button size="sm" onClick={() => handleAdminAction(swap.id, "approved", swap.adminNotes)}>
                        Approve &amp; Swap
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleAdminAction(swap.id, "denied", swap.adminNotes)}>
                        Deny
                      </Button>
                    </>
                  )}
                  {swap.status !== "approved" && swap.status !== "denied" && swap.status !== "cancelled" && (
                    <Button size="sm" variant="ghost" onClick={() => handleAdminAction(swap.id, "cancelled", swap.adminNotes)}>
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
