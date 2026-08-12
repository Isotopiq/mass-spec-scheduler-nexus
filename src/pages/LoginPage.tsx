
import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import LoginForm from "../components/auth/LoginForm";
import PasswordResetDialog from "../components/auth/PasswordResetDialog";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Loader2 } from "lucide-react";

const LoginPage: React.FC = () => {
  const { isLoading, isAuthenticated } = useAuth();
  const [isPasswordResetOpen, setIsPasswordResetOpen] = useState(false);

  console.log("LoginPage: Render - loading:", isLoading, "authenticated:", isAuthenticated);

  // Show loading while checking authentication
  if (isLoading) {
    console.log("LoginPage: Showing loading state");
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-mslab-400" />
          <span className="text-lg text-mslab-400">Loading...</span>
        </div>
      </div>
    );
  }

  // Redirect if authenticated
  if (isAuthenticated) {
    console.log("LoginPage: User authenticated, redirecting to dashboard");
    return <Navigate to="/dashboard" replace />;
  }

  console.log("LoginPage: Showing login form");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <img 
            src="/lovable-uploads/40965317-613a-41b7-bc11-d9e8b6cba9ae.png" 
            alt="TeSlab Lab Logo" 
            className="mx-auto h-16 w-auto object-contain mb-4"
          />
        </div>
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Welcome to MSLab Scheduler</CardTitle>
            <CardDescription className="text-center">
              Sign in to your account to manage laboratory instruments and bookings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <LoginForm />
            <div className="text-center">
              <Button
                variant="link"
                onClick={() => setIsPasswordResetOpen(true)}
                className="text-sm text-muted-foreground hover:text-primary"
              >
                Forgot your password?
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <PasswordResetDialog
        isOpen={isPasswordResetOpen}
        onClose={() => setIsPasswordResetOpen(false)}
      />
    </div>
  );
};

export default LoginPage;
