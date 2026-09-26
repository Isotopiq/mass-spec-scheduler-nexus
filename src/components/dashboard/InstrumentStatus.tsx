
import React, { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { useOptimizedBooking } from "../../contexts/OptimizedBookingContext";
import { Loader2 } from "lucide-react";

const InstrumentStatus: React.FC = () => {
  const { instruments, isLoading, refreshData } = useOptimizedBooking();

  // Refresh data when component mounts if no instruments are loaded
  useEffect(() => {
    if (!isLoading && instruments.length === 0) {
      console.log("No instruments loaded, refreshing data...");
      refreshData();
    }
  }, [instruments.length, isLoading, refreshData]);

  // Helper to determine the status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-500";
      case "maintenance":
        return "bg-yellow-500";
      case "in-use":
      case "in_use":
        return "bg-blue-500";
      case "offline":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium">Instrument Status</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span className="text-sm text-muted-foreground">Loading instruments...</span>
          </div>
        ) : instruments.length > 0 ? (
          <div className="space-y-4">
            {instruments.map((instrument) => (
              <div key={instrument.id} className="flex items-center justify-between border-b pb-2">
                <div>
                  <p className="font-medium">{instrument.name}</p>
                  <p className="text-sm text-muted-foreground">{instrument.location}</p>
                </div>
                <Badge
                  variant="outline"
                  className="flex items-center gap-2 capitalize"
                >
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(instrument.status)}`}></div>
                  {instrument.status.replace('_', ' ')}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-4">
            <p>No instruments available</p>
            <p className="text-xs mt-1">Add instruments in the Admin panel</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InstrumentStatus;
