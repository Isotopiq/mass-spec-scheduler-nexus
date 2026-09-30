
import type { Database } from '../integrations/supabase/types';

// Define types based on the database schema
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Instrument = Database['public']['Tables']['instruments']['Row'];
export type Booking = Database['public']['Tables']['bookings']['Row'];
export type MaintenanceHistory = Database['public']['Tables']['maintenance_history']['Row'];
export type Comment = Database['public']['Tables']['comments']['Row'];

// Create insert types for creating new records
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type InstrumentInsert = Database['public']['Tables']['instruments']['Insert'];
export type BookingInsert = Database['public']['Tables']['bookings']['Insert'];
export type MaintenanceHistoryInsert = Database['public']['Tables']['maintenance_history']['Insert'];
export type CommentInsert = Database['public']['Tables']['comments']['Insert'];

// Create update types for updating records
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];
export type InstrumentUpdate = Database['public']['Tables']['instruments']['Update'];
export type BookingUpdate = Database['public']['Tables']['bookings']['Update'];
export type MaintenanceHistoryUpdate = Database['public']['Tables']['maintenance_history']['Update'];
export type CommentUpdate = Database['public']['Tables']['comments']['Update'];
