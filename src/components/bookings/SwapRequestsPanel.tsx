import React, { useState, useEffect, useCallback } from "react";
import { useBookingSwaps } from "../../hooks/useBookingSwaps";
import { BookingSwap } from "../../types";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { format } from "date-fns";
import { toast } from "sonner";

export const SwapRequestsPanel: React.FC = () => {
  const [swaps, setSwaps] = useState<BookingSwap[]>([]);
  const [activeTab, setActiveTab] = useState("pending");
  const { fetchSwaps, respondToSwap, isLoading } = useBookingSwaps();

  const load = useCallback(async () => {
    try {
      const data = await fetchSwaps(activeTab === "all" ? undefined : activeTab);
      setSwaps(data);
    } catch (error) {
      console.error("Failed to load swaps", error);
      toast.error("Failed to load swap requests");
    }
  }, [activeTab, fetchSwaps]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRespond = async (swapId: string, response: "accept" | "decline" | "cancel") => {
    try {
      await respondToSwap(swapId, response);
      toast.success(`Swap ${response === "cancel" ? "cancelled" : response + "ed"}`);
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
        return "secondary";
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Swap Requests</h3>
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

      <div className="space-y-3">
        {swaps.map((swap) => (
          <div key={swap.id} className="border rounded-lg p-4 bg-card">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{swap.requesterInstrumentName}</span>
                  <span className="text-muted-foreground">↔</span>
                  <span className="font-medium">{swap.recipientInstrumentName}</span>
                  <Badge variant={getStatusVariant(swap.status)}>{swap.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Requested by {swap.requesterName || swap.requesterUserId} ·{" "}
                  {swap.requestedAt ? format(new Date(swap.requestedAt), "PP p") : ""}
                </p>
                <div className="text-sm">
                  <p>
                    <strong>Offered:</strong>{" "}
                    {swap.requesterInstrumentName} at{" "}
                    {swap.requesterStart ? format(new Date(swap.requesterStart), "PP p") : ""} -{" "}
                    {swap.requesterEnd ? format(new Date(swap.requesterEnd), "p") : ""}
                  </p>
                  <p>
                    <strong>For:</strong>{" "}
                    {swap.recipientInstrumentName} at{" "}
                    {swap.recipientStart ? format(new Date(swap.recipientStart), "PP p") : ""} -{" "}
                    {swap.recipientEnd ? format(new Date(swap.recipientEnd), "p") : ""}
                  </p>
                </div>
              </div>

              {swap.status === "pending" && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleRespond(swap.id, "accept")}>
                    Accept
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleRespond(swap.id, "decline")}>
                    Decline
                  </Button>
                </div>
              )}

              {swap.status !== "approved" && swap.status !== "denied" && swap.status !== "cancelled" && swap.status !== "pending" && (
                <Button size="sm" variant="outline" onClick={() => handleRespond(swap.id, "cancel")}>
                  Cancel
                </Button>
              )}
            </div>
            {swap.adminNotes && (
              <p className="text-sm text-muted-foreground mt-2">
                <strong>Admin note:</strong> {swap.adminNotes}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
