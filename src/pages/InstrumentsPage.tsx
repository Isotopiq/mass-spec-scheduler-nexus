
import React from "react";
import { useOptimizedBooking } from "../contexts/OptimizedBookingContext";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const InstrumentsPage: React.FC = () => {
  const { instruments } = useOptimizedBooking();
  const { isAuthenticated } = useAuth();

  // Helper to determine the status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-500 text-white";
      case "maintenance":
        return "bg-yellow-500 text-white";
      case "in_use":
        return "bg-blue-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container py-6 text-center">
        <h2 className="text-xl font-semibold">Please log in to view instruments</h2>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Instruments</h1>
      
      {instruments.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-muted-foreground">Loading instruments...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {instruments.map((instrument) => (
            <Card key={instrument.id} className="overflow-hidden">
              <div className="h-40 bg-mslab-100 flex items-center justify-center">
                {instrument.image ? (
                  <img 
                    src={instrument.image} 
                    alt={instrument.name} 
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="text-mslab-400 text-5xl font-bold opacity-20">
                    {instrument.name.substring(0, 2)}
                  </div>
                )}
              </div>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle>{instrument.name}</CardTitle>
                  <Badge className={getStatusColor(instrument.status)}>
                    {instrument.status}
                  </Badge>
                </div>
                <CardDescription>{instrument.model || ""}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  <strong>Location:</strong> {instrument.location}
                </p>
              </CardContent>
              <CardFooter>
                <Link to="/calendar" className="w-full">
                  <Button 
                    variant={instrument.status === "available" ? "default" : "outline"}
                    disabled={instrument.status !== "available"}
                    className="w-full"
                  >
                    {instrument.status === "available" ? "Book Now" : "Currently Unavailable"}
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default InstrumentsPage;
