const parseJson = (value: string | null): any => {
  if (!value) return null;
  try { return JSON.parse(value); } catch { return null; }
};

const getSettings = (): any => {
  const user = parseJson(localStorage.getItem('standalone_auth_user'));
  if (user?.settings) return user.settings;
  return parseJson(localStorage.getItem('mslab_user_settings'));
};

export const getUserEmailPreferences = (): { emailNotifications: boolean; bookingReminders: boolean } => {
  const settings = getSettings();
  if (settings) {
    return {
      emailNotifications: settings.emailNotifications ?? true,
      bookingReminders: settings.bookingReminders ?? true,
    };
  }
  return {
    emailNotifications: true,
    bookingReminders: true,
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
      return true;
  }
};
