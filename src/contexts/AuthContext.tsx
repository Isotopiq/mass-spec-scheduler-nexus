import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "../integrations/supabase/client";
import { toast } from "sonner";
import { User, Profile, CreateUserData, Session } from "../types";
import { sendEmail } from "../utils/emailNotifications";
import { UserDeletionService } from "../components/admin/user/UserDeletionService";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  users: User[];
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (updatedUser: User) => void;
  updateUserPassword: (userId: string, newPassword: string) => Promise<void>;
  createUser: (userData: CreateUserData) => Promise<void>;
  deleteUser: (userId: string) => void;
  refreshCurrentUser: () => Promise<void>;
  refreshUsers: () => Promise<void>;
  signup: (email: string, password: string, name: string, role?: 'admin' | 'user') => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_URL || '';
const AUTH_USER_KEY = 'standalone_auth_user';

const profileFromRow = (row: any): Profile => ({
  id: row.id,
  name: row.name,
  email: row.email,
  role: row.role as 'admin' | 'user',
  department: row.department,
  profileImage: row.profile_image,
});

const userFromRow = (row: any): User => ({
  ...profileFromRow(row),
  app_metadata: {},
  user_metadata: { name: row.name, department: row.department },
  aud: 'authenticated',
  created_at: row.created_at,
  updated_at: row.updated_at,
  email_confirmed_at: row.created_at,
  phone: null,
  last_sign_in_at: row.last_sign_in_at,
  is_anonymous: false,
});

const sessionFromData = (data: any): Session | null => {
  if (!data?.session) return null;
  return {
    access_token: data.session.access_token,
    token_type: data.session.token_type || 'bearer',
    expires_in: data.session.expires_in,
    expires_at: data.session.expires_at,
    user: data.session.user,
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const isAuthenticated = !!user;

  const createExtendedUser = (base: any, profileData?: Profile): User => {
    if (profileData) {
      return { ...base, ...profileData, user_metadata: { name: profileData.name, department: profileData.department } };
    }
    return base;
  };

  const fetchUsers = async () => {
    try {
      const freshUsers = await UserDeletionService.fetchAllUsers();
      setUsers(freshUsers);
      return freshUsers;
    } catch (error) {
      console.error("AuthContext: Error fetching users:", error);
      throw error;
    }
  };

  const refreshUsers = async () => {
    try {
      const freshUsers = await fetchUsers();
      console.log(`AuthContext: Users list refreshed - ${freshUsers.length} users`);
    } catch (error) {
      console.error('AuthContext: Error refreshing users:', error);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('AuthContext: Session error:', sessionError);
          if (mounted) setIsLoading(false);
          return;
        }

        if (mounted) {
          setSession(sessionFromData({ session: initialSession }));
          if (initialSession?.user) {
            const baseUser = initialSession.user as User;
            try {
              const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', baseUser.id)
                .single();
              const profile = profileData ? profileFromRow(profileData) : undefined;
              setUser(createExtendedUser(baseUser, profile));
            } catch (profileError) {
              console.error('AuthContext: Profile fetch error:', profileError);
              setUser(baseUser);
            }
          } else {
            setUser(null);
          }
          setIsLoading(false);
        }
      } catch (error) {
        console.error('AuthContext: Initialization error:', error);
        if (mounted) setIsLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;
      setSession(sessionFromData({ session: newSession }));
      if (newSession?.user) {
        const baseUser = newSession.user as User;
        setTimeout(async () => {
          try {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', baseUser.id)
              .single();
            const profile = profileData ? profileFromRow(profileData) : undefined;
            if (mounted) setUser(createExtendedUser(baseUser, profile));
          } catch (error) {
            console.error('AuthContext: Error fetching profile on auth change:', error);
            if (mounted) setUser(baseUser);
          }
        }, 100);
      } else {
        setUser(null);
      }
    });

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated && !isLoading && user?.role === 'admin') {
      fetchUsers();
    }
  }, [isAuthenticated, isLoading, user]);

  const sendWelcomeEmail = async (email: string, name: string) => {
    try {
      const welcomeEmail = {
        to: email,
        subject: `Welcome to Lab Management System, ${name}!`,
        body: `Welcome to our lab management platform!`,
        templateType: "welcome",
        variables: { userName: name }
      };
      await sendEmail(welcomeEmail);
    } catch (error) {
      console.error('Error sending welcome email:', error);
    }
  };

  const login = async (email: string, password: string, rememberMe?: boolean) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password, rememberMe });
    if (error) throw error;
  };

  const signup = async (email: string, password: string, name: string, _role: 'admin' | 'user' = 'user'): Promise<void> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } }
    });

    if (error) throw error;
    if (data.user) {
      setTimeout(() => sendWelcomeEmail(email, name), 2000);
    }
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const updateUserProfile = (updatedUser: User) => {
    setUser(updatedUser);
    setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
    try {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(updatedUser));
    } catch {
      // ignore storage errors
    }
  };

  const updateUserPassword = async (userId: string, newPassword: string) => {
    if (!newPassword || newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }
    const isAdmin = user?.role === 'admin' && user?.id !== userId;
    const token = localStorage.getItem('standalone_auth_token');
    const res = await fetch(`${API_URL}/api/auth/${isAdmin ? 'admin-update-password' : 'update-password'}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token || ''}`,
      },
      body: JSON.stringify(isAdmin ? { userId, password: newPassword } : { password: newPassword }),
    });
    const json = await res.json();
    if (!res.ok || json.error) throw new Error(json.error?.message || 'Password update failed');
  };

  const createUser = async (userData: CreateUserData) => {
    const token = localStorage.getItem('standalone_auth_token');
    const res = await fetch(`${API_URL}/api/auth/admin-create-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token || ''}`,
      },
      body: JSON.stringify({
        email: userData.email,
        password: userData.password,
        name: userData.name,
        role: userData.role,
        department: userData.department,
      }),
    });
    const json = await res.json();
    if (!res.ok || json.error) throw new Error(json.error?.message || 'User creation failed');

    if (json.data?.user) {
      setTimeout(() => sendWelcomeEmail(userData.email, userData.name), 2000);
    }
    if (!userData.password && json.data?.generatedPassword) {
      toast.success(`User created. Temporary password: ${json.data.generatedPassword}`);
    }
    await refreshUsers();
  };

  const deleteUser = (userId: string) => {
    setUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
  };

  const refreshCurrentUser = async () => {
    try {
      const { data: { user: refreshedUser } } = await supabase.auth.getUser();
      if (refreshedUser) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', refreshedUser.id)
          .single();
        if (profileData) {
          const profile = profileFromRow(profileData);
          setUser(createExtendedUser(refreshedUser, profile));
        }
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  const value = {
    user,
    session,
    isAuthenticated,
    isLoading,
    users,
    login,
    logout,
    updateUserProfile,
    updateUserPassword,
    createUser,
    deleteUser,
    refreshCurrentUser,
    refreshUsers,
    signup,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
