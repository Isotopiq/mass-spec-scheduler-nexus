
import React, { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "../ui/button";
import { useAuth } from "../../contexts/AuthContext";
import { useAppSettings } from "../../hooks/useAppSettings";
import { 
  Calendar, 
  BarChart3, 
  Settings2, 
  User, 
  LogOut, 
  Home,
  Beaker,
  BookOpen,
  ClipboardList,
  Menu,
  X
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { NotificationsDropdown } from "./NotificationsDropdown";
import { SiteLogo } from "../SiteLogo";

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { settings } = useAppSettings();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  // Memoize the avatar URL to prevent flashing
  const avatarImageUrl = useMemo(() => {
    return user?.profileImage 
      ? `${user.profileImage}${user.profileImage.includes('?') ? '&' : '?'}t=${user.profileImage}`
      : undefined;
  }, [user?.profileImage]);

  const navItems = [
    { path: "/", label: "Home", icon: Home },
    { path: "/dashboard", label: "Dashboard", icon: BarChart3 },
    { path: "/calendar", label: "Calendar", icon: Calendar },
    { path: "/instruments", label: "Instruments", icon: Beaker },
    { path: "/my-bookings", label: "My Bookings", icon: BookOpen },
    { path: "/analytics", label: "Analytics", icon: BarChart3 },
  ];

  const adminNavItems = [
    { path: "/admin", label: "Admin", icon: Settings2 },
  ];

  if (!user) {
    return null;
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4 flex-shrink-0 min-w-0">
            <div className="xl:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle navigation menu"
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </div>

            <Link to="/" className="flex items-center flex-shrink-0 min-w-0">
              <SiteLogo
                src={settings?.logo_url}
                alt="Site logo"
                className="h-8 xl:h-10 w-auto max-w-[120px] sm:max-w-[140px] object-contain"
              />
              <span className="ml-2 text-base font-bold text-gray-900 hidden sm:inline whitespace-nowrap">
                MSLab Scheduler
              </span>
            </Link>
            
            <div className="hidden xl:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`inline-flex items-center px-2 py-2 rounded-md text-sm font-medium whitespace-nowrap shrink-0 transition-colors ${
                      isActive(item.path)
                        ? "bg-mslab-100 text-mslab-700"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-1" />
                    {item.label}
                  </Link>
                );
              })}
              
              {user.role === "admin" && adminNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`inline-flex items-center px-2 py-2 rounded-md text-sm font-medium whitespace-nowrap shrink-0 transition-colors ${
                      isActive(item.path)
                        ? "bg-mslab-100 text-mslab-700"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-1" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <NotificationsDropdown />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage 
                      src={avatarImageUrl} 
                      alt={user.name}
                    />
                    <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/my-bookings" className="flex items-center">
                    <ClipboardList className="mr-2 h-4 w-4" />
                    <span>My Bookings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="flex items-center">
                    <Settings2 className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="absolute top-16 left-0 w-full bg-white border-b shadow-lg px-4 py-4 xl:hidden z-50">
          <div className="flex flex-col space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive(item.path)
                      ? "bg-mslab-100 text-mslab-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {item.label}
                </Link>
              );
            })}
            {user.role === "admin" && adminNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive(item.path)
                      ? "bg-mslab-100 text-mslab-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
