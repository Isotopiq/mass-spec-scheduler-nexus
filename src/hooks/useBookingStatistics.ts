
import { useMemo } from "react";
import { Booking, Instrument, BookingStatistics } from "../types";

export const useBookingStatistics = (bookings: Booking[], instruments: Instrument[]): BookingStatistics => {
  return useMemo(() => {
    const totalBookings = bookings.length;

    // Instrument Usage
    const instrumentUsageMap = new Map<string, { instrumentName: string, bookingCount: number, totalHours: number }>();
    instruments.forEach(instrument => {
      instrumentUsageMap.set(instrument.id, { instrumentName: instrument.name, bookingCount: 0, totalHours: 0 });
    });

    bookings.forEach(booking => {
      const instrumentStats = instrumentUsageMap.get(booking.instrumentId);
      if (instrumentStats) {
        instrumentStats.bookingCount++;
        const start = new Date(booking.start);
        const end = new Date(booking.end);
        instrumentStats.totalHours += (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      }
    });

    const instrumentUsage = Array.from(instrumentUsageMap.entries()).map(([instrumentId, data]) => ({
      instrumentId,
      instrumentName: data.instrumentName,
      bookingCount: data.bookingCount,
      totalHours: data.totalHours
    })).sort((a, b) => b.totalHours - a.totalHours);

    // User Bookings
    const userBookingsMap = new Map<string, { userName: string, bookingCount: number, totalHours: number }>();
    bookings.forEach(booking => {
      if (!userBookingsMap.has(booking.userId)) {
        userBookingsMap.set(booking.userId, { userName: booking.userName, bookingCount: 0, totalHours: 0 });
      }
      const userStats = userBookingsMap.get(booking.userId);
      if (userStats) {
        userStats.bookingCount++;
        const start = new Date(booking.start);
        const end = new Date(booking.end);
        userStats.totalHours += (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      }
    });

    const userBookings = Array.from(userBookingsMap.entries()).map(([userId, data]) => ({
      userId,
      userName: data.userName,
      bookingCount: data.bookingCount,
      totalHours: data.totalHours
    })).sort((a, b) => b.totalHours - a.totalHours);

    // Weekly Usage
    const weeklyUsageMap = new Map<string, number>();
    bookings.forEach(booking => {
      const start = new Date(booking.start);
      const week = `${start.getFullYear()}-W${getWeek(start)}`;
      weeklyUsageMap.set(week, (weeklyUsageMap.get(week) || 0) + 1);
    });

    const weeklyUsage = Array.from(weeklyUsageMap.entries()).map(([week, bookingCount]) => ({
      week,
      bookingCount
    })).sort((a, b) => a.week.localeCompare(b.week));

    return {
      totalBookings,
      instrumentUsage,
      userBookings,
      weeklyUsage
    };
  }, [bookings, instruments]);
};

// Helper function to get week number
const getWeek = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
};
