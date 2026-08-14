
import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "./contexts/AuthContext";
import { OptimizedBookingProvider } from "./contexts/OptimizedBookingContext";
import { useAppSettings } from "./hooks/useAppSettings";
import AppLayout from "./components/layout/AppLayout";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import CalendarPage from "./pages/CalendarPage";
import InstrumentsPage from "./pages/InstrumentsPage";
import MyBookingsPage from "./pages/MyBookingsPage";
import AdminPage from "./pages/AdminPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import NotificationsPage from "./pages/NotificationsPage";
import LoginPage from "./pages/LoginPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import NotFound from "./pages/NotFound";

const DEFAULT_FAVICON = "/site-assets/c9351e76-a090-4113-bffa-7ee6800178c0.png";
const DEFAULT_SITE_TITLE = "TeSlaa Lab MS Scheduling Suite";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

function FaviconManager() {
  const { settings } = useAppSettings();
  useEffect(() => {
    const faviconUrl = settings?.favicon_url || DEFAULT_FAVICON;
    let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = faviconUrl;
  }, [settings?.favicon_url]);
  return null;
}

function DocumentTitleManager() {
  const { settings } = useAppSettings();
  useEffect(() => {
    document.title = settings?.site_name || DEFAULT_SITE_TITLE;
  }, [settings?.site_name]);
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <Toaster />
          <FaviconManager />
          <DocumentTitleManager />
          <AuthProvider>
            <OptimizedBookingProvider>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/" element={<AppLayout />}>
                  <Route index element={<Index />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="calendar" element={<CalendarPage />} />
                  <Route path="instruments" element={<InstrumentsPage />} />
                  <Route path="my-bookings" element={<MyBookingsPage />} />
                  <Route path="admin" element={<AdminPage />} />
                  <Route path="analytics" element={<AnalyticsPage />} />
                  <Route path="profile" element={<ProfilePage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="notifications" element={<NotificationsPage />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </OptimizedBookingProvider>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
