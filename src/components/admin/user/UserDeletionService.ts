
import { supabase } from "../../../integrations/supabase/client";
import { User } from "../../../types";

export class UserDeletionService {
  static async deleteUserCompletely(user: User): Promise<void> {
    console.log('=== Starting user deletion process ===');
    console.log('User to delete:', user.id, user.email);

    try {
      // Step 1: Delete comments first (no foreign key dependencies)
      console.log('Step 1: Deleting user comments...');
      const { error: commentsError, count: commentsCount } = await supabase
        .from('comments')
        .delete({ count: 'exact' })
        .eq('user_id', user.id);
      
      if (commentsError) {
        console.error('Error deleting comments:', commentsError);
        throw new Error(`Failed to delete comments: ${commentsError.message}`);
      }
      console.log(`Deleted ${commentsCount || 0} comments`);

      // Step 2: Delete bookings
      console.log('Step 2: Deleting user bookings...');
      const { error: bookingsError, count: bookingsCount } = await supabase
        .from('bookings')
        .delete({ count: 'exact' })
        .eq('user_id', user.id);
      
      if (bookingsError) {
        console.error('Error deleting bookings:', bookingsError);
        throw new Error(`Failed to delete bookings: ${bookingsError.message}`);
      }
      console.log(`Deleted ${bookingsCount || 0} bookings`);

      // Step 3: Delete user profile (this should cascade to auth.users if properly configured)
      console.log('Step 3: Deleting user profile...');
      const { error: profileError, count: profileCount } = await supabase
        .from('profiles')
        .delete({ count: 'exact' })
        .eq('id', user.id);
        
      if (profileError) {
        console.error('Error deleting profile:', profileError);
        throw new Error(`Failed to delete profile: ${profileError.message}`);
      }
      console.log(`Deleted ${profileCount || 0} profile records`);

      // Step 4: Verify deletion
      console.log('Step 4: Verifying deletion...');
      const { data: remainingProfile, error: verifyError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (verifyError) {
        console.error('Error verifying deletion:', verifyError);
        throw new Error(`Verification failed: ${verifyError.message}`);
      }

      if (remainingProfile) {
        console.error('Profile still exists after deletion attempt');
        throw new Error('Profile deletion verification failed - user still exists');
      }

      console.log('=== User deletion completed successfully ===');
    } catch (error) {
      console.error('=== User deletion failed ===');
      console.error('Error details:', error);
      throw error;
    }
  }

  static async fetchAllUsers(): Promise<User[]> {
    console.log('Fetching fresh users from database...');
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('name');
      
    if (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
    
    // Convert profiles to extended users
    const extendedUsers = data.map(profile => ({
      id: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role as 'admin' | 'user',
      department: profile.department,
      profileImage: profile.profile_image,
      // Add required Supabase User properties with defaults
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      email_confirmed_at: new Date().toISOString(),
      phone_confirmed_at: null,
      confirmation_sent_at: null,
      recovery_sent_at: null,
      email_change_sent_at: null,
      new_email: null,
      invited_at: null,
      action_link: null,
      phone: null,
      new_phone: null,
      last_sign_in_at: null,
      is_anonymous: false
    })) as User[];
    
    console.log(`Successfully fetched ${extendedUsers.length} users from database`);
    return extendedUsers;
  }
}
