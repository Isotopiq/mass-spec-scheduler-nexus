export interface Profile {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  department?: string;
  profileImage?: string | null;
}

export interface User extends Profile {
  app_metadata?: Record<string, any>;
  user_metadata?: Record<string, any>;
  aud?: string;
  created_at?: string;
  updated_at?: string;
  email_confirmed_at?: string | null;
  phone?: string | null;
  phone_confirmed_at?: string | null;
  confirmation_sent_at?: string | null;
  recovery_sent_at?: string | null;
  email_change_sent_at?: string | null;
  new_email?: string | null;
  invited_at?: string | null;
  action_link?: string | null;
  last_sign_in_at?: string | null;
  is_anonymous?: boolean;
}

export interface Session {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  expires_at?: number;
  user?: User;
}

export interface CreateUserData {
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'user';
  department?: string;
  profileImage?: string | null;
}

export interface Booking {
  id: string;
  instrumentId: string;
  instrumentName: string;
  start: string;
  end: string;
  purpose: string;
  details?: string;
  status: string;
  userId: string;
  userName: string;
  comments: Comment[];
  createdAt?: string;
  sequenceFileKey?: string | null;
  sequenceFileName?: string | null;
  sequenceFileSize?: number | null;
  sequenceFileUploadedAt?: string | null;
}

export interface Instrument {
  id: string;
  name: string;
  description: string;
  status: 'available' | 'in_use' | 'maintenance' | 'offline';
  location: string;
  specifications: string;
  image: string;
  type?: string;
  model?: string;
  calibrationDue?: string;
  maintenanceHistory?: Array<{ date: string; description: string }>;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
}

export interface BookingSwap {
  id: string;
  requesterBookingId: string;
  recipientBookingId: string;
  requesterUserId: string;
  recipientUserId: string;
  status: 'pending' | 'accepted' | 'declined' | 'approved' | 'denied' | 'cancelled';
  adminNotes?: string | null;
  requestedAt?: string;
  respondedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  // Join fields
  requesterName?: string;
  requesterEmail?: string;
  recipientName?: string;
  recipientEmail?: string;
  requesterInstrumentName?: string;
  requesterPurpose?: string;
  requesterStart?: string;
  requesterEnd?: string;
  recipientInstrumentName?: string;
  recipientPurpose?: string;
  recipientStart?: string;
  recipientEnd?: string;
}

export interface BookingStatistics {
  totalBookings: number;
  instrumentUsage: Array<{
    instrumentId: string;
    instrumentName: string;
    bookingCount: number;
    totalHours: number;
  }>;
  userBookings: Array<{
    userId: string;
    userName: string;
    bookingCount: number;
    totalHours: number;
  }>;
  weeklyUsage: Array<{
    week: string;
    bookingCount: number;
  }>;
}
