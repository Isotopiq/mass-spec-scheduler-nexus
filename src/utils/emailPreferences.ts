
// Utility function to check if a user has opted in for email notifications
export const getUserEmailPreferences = (): { emailNotifications: boolean; bookingReminders: boolean } => {
  const savedSettings = localStorage.getItem('mslab_user_settings');
  
  if (savedSettings) {
    const settings = JSON.parse(savedSettings);
    return {
      emailNotifications: settings.emailNotifications ?? true, // Default to true
      bookingReminders: settings.bookingReminders ?? true    // Default to true
    };
  }
  
  // If no settings saved, default to opted in
  return {
    emailNotifications: true,
    bookingReminders: true
  };
};

export const shouldSendEmail = (emailType: 'notification' | 'reminder'): boolean => {
  const preferences = getUserEmailPreferences();
  
  switch (emailType) {
    case 'notification':
      return preferences.emailNotifications;
    case 'reminder':
      return preferences.bookingReminders;
    default:
      return true; // Default to true for unknown types
  }
};
