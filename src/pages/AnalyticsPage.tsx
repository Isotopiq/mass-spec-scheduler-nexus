
import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Button } from "../components/ui/button";
import { useOptimizedBooking } from "../contexts/OptimizedBookingContext";
import { exportAnalyticsToPDF } from "../utils/pdfExport";

const AnalyticsPage: React.FC = () => {
  const { statistics } = useOptimizedBooking();

  // Colors for the charts
  const COLORS = ["#9b87f5", "#7E69AB", "#6E59A5", "#D6BCFA", "#E5DEFF"];

  // Format data for user booking pie chart with shortened names
  const userPieData = statistics.userBookings.map(item => ({
    name: item.userName.length > 10 ? item.userName.substring(0, 10) + "..." : item.userName,
    fullName: item.userName,
    value: item.bookingCount
  }));

  // Format instrument usage data for bar chart
  const instrumentBarData = statistics.instrumentUsage.map(item => ({
    name: item.instrumentName,
    hours: parseFloat(item.totalHours.toFixed(1))
  }));

  // Format weekly usage data
  const weeklyData = statistics.weeklyUsage.map(item => ({
    week: item.week,
    bookings: item.bookingCount
  }));
  
  const handleExportPDF = () => {
    exportAnalyticsToPDF(statistics, "MSLab Analytics Report");
  };

  // Custom label function for pie chart to prevent overlap
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
    if (percent < 0.05) return null; // Don't show labels for slices smaller than 5%
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize="12"
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <Button onClick={handleExportPDF}>
          Export as PDF
        </Button>
      </div>
      
      <Tabs defaultValue="usage" className="w-full">
        <TabsList>
          <TabsTrigger value="usage">Usage Analysis</TabsTrigger>
          <TabsTrigger value="users">User Analytics</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>
        
        <TabsContent value="usage" className="pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Instrument Usage (Hours)</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={instrumentBarData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                    <Tooltip formatter={(value) => [`${value} hours`, "Usage"]} />
                    <Legend />
                    <Bar dataKey="hours" fill="#9b87f5" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Booking Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Total Bookings</h3>
                      <p className="text-3xl font-bold">{statistics.totalBookings}</p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Most Used Instrument</h3>
                      {statistics.instrumentUsage.length > 0 && (
                        <div>
                          <p className="text-xl font-semibold">{statistics.instrumentUsage[0].instrumentName}</p>
                          <p className="text-sm text-green-600 font-medium">{statistics.instrumentUsage[0].totalHours.toFixed(1)} total hours</p>
                          <p className="text-sm text-muted-foreground">{statistics.instrumentUsage[0].bookingCount} bookings</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={instrumentBarData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="hours"
                          nameKey="name"
                          label={renderCustomLabel}
                        >
                          {instrumentBarData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value} hours`, "Usage"]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="users" className="pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">User Booking Distribution</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={userPieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={renderCustomLabel}
                    >
                      {userPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name, props) => [
                        `${value} bookings`, 
                        props.payload.fullName
                      ]} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {statistics.userBookings.slice(0, 5).map((user, index) => (
                    <div key={user.userId} className="flex items-center">
                      <div className="flex-none w-10 h-10 rounded-full bg-mslab-200 flex items-center justify-center font-bold text-mslab-700">
                        {index + 1}
                      </div>
                      <div className="ml-4">
                        <p className="font-medium">{user.userName}</p>
                        <div className="flex space-x-4 text-sm text-muted-foreground">
                          <p>{user.bookingCount} bookings</p>
                          <p>{user.totalHours.toFixed(1)} hours</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="trends" className="pt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Weekly Booking Trends</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={weeklyData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="week" 
                    angle={-45} 
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis allowDecimals={false} />
                  <Tooltip formatter={(value) => [`${value}`, "Bookings"]} />
                  <Legend />
                  <Bar dataKey="bookings" fill="#9b87f5" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsPage;
