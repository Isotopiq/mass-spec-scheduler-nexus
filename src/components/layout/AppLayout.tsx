
import React, { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import { useAuth } from "../../contexts/AuthContext";
import { useOptimizedBooking } from "../../contexts/OptimizedBookingContext";
import Footer from "./Footer";
import { Loader2 } from "lucide-react";

const AppLayout: React.FC = () => {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const { isLoading: bookingLoading, isInitialized } = useOptimizedBooking();
  const location = useLocation();
  const navigate = useNavigate();
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  
  console.log("AppLayout: Auth loading:", authLoading, "Authenticated:", isAuthenticated, "Path:", location.pathname);
  
  // Update last activity on user interactions
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    const activityHandler = () => {
      setLastActivity(Date.now());
    };
    
    events.forEach(event => {
      window.addEventListener(event, activityHandler);
    });
    
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, activityHandler);
      });
    };
  }, []);
  
  // Check for auto-logout based on user's settings
  useEffect(() => {
    if (isAuthenticated && user) {
      const savedSettings = localStorage.getItem('mslab_user_settings');
      const settings = savedSettings ? JSON.parse(savedSettings) : { autoLogout: 30 };
      const autoLogoutTime = settings.autoLogout * 60 * 1000;
      
      const checkActivityInterval = setInterval(() => {
        const currentTime = Date.now();
        const elapsedTime = currentTime - lastActivity;
        
        if (elapsedTime > autoLogoutTime) {
          console.log(`Auto logout triggered after ${settings.autoLogout} minutes of inactivity`);
          clearInterval(checkActivityInterval);
          navigate('/login', { state: { autoLogout: true } });
          window.location.reload();
        }
      }, 10000);
      
      return () => clearInterval(checkActivityInterval);
    }
  }, [isAuthenticated, user, lastActivity, navigate]);
  
  // Handle authentication redirect
  useEffect(() => {
    if (!authLoading) {
      console.log("AppLayout - Auth loading complete, authenticated:", isAuthenticated);
      
      if (location.pathname === "/" && isAuthenticated) {
        console.log("AppLayout - Redirecting authenticated user from root to dashboard");
        navigate("/dashboard", { replace: true });
      }
    }
  }, [isAuthenticated, location.pathname, navigate, authLoading]);
  
  // Show loading state while auth is loading
  if (authLoading) {
    console.log("AppLayout - Showing auth loading state");
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-mslab-400" />
          <span className="text-lg text-mslab-400">Loading application...</span>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    console.log("AppLayout - User not authenticated, redirecting to login");
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Show data loading state for dashboard only when not yet initialized
  const showDataLoading = location.pathname === "/dashboard" && bookingLoading && !isInitialized;

  console.log("AppLayout - Rendering main layout");

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">
        {showDataLoading ? (
          <div className="flex items-center justify-center h-full min-h-[60vh]">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-mslab-400" />
              <span className="text-lg text-mslab-400">Loading dashboard data...</span>
            </div>
          </div>
        ) : (
          <Outlet />
        )}
      </main>
      <Footer />
    </div>
  );
};

export default AppLayout;
