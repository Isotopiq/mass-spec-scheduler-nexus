
import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { useOptimizedBooking } from "../../contexts/OptimizedBookingContext";

const UsageStatistics: React.FC = () => {
  const { statistics } = useOptimizedBooking();

  // Format instrument usage for the chart
  const chartData = statistics.instrumentUsage.map(item => ({
    name: item.instrumentName,
    hours: parseFloat(item.totalHours.toFixed(1))
  }));

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle className="text-lg font-medium">Instrument Usage Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={70}
              />
              <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
              <Tooltip formatter={(value) => [`${value} hours`, "Usage"]} />
              <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill="#9B87F5" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium text-sm mb-2">Total Bookings</h3>
            <p className="text-2xl font-bold">{statistics.totalBookings}</p>
          </div>
          <div>
            <h3 className="font-medium text-sm mb-2">Most Active User</h3>
            {statistics.userBookings.length > 0 && (
              <p className="text-lg font-medium">
                {statistics.userBookings[0].userName}
                <span className="block text-sm font-normal text-muted-foreground">
                  {statistics.userBookings[0].bookingCount} bookings
                </span>
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UsageStatistics;
