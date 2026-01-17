let cachedUserId: string | null = null;

const generateUserId = (): string => {
  return `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
};

export const getUserId = async (): Promise<string> => {
  if (cachedUserId) {
    return cachedUserId;
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      let userId = window.localStorage.getItem('jetzz_user_id');

      if (!userId) {
        userId = generateUserId();
        window.localStorage.setItem('jetzz_user_id', userId);
      }

      cachedUserId = userId;
      return userId;
    } catch (error) {
      console.error('Error with localStorage:', error);
    }
  }

  if (!cachedUserId) {
    cachedUserId = generateUserId();
  }

  return cachedUserId;
};

export const getUserIdSync = (): string => {
  if (cachedUserId) {
    return cachedUserId;
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const userId = window.localStorage.getItem('jetzz_user_id');
      if (userId) {
        cachedUserId = userId;
        return userId;
      }
    } catch (error) {
      console.error('Error reading localStorage:', error);
    }
  }

  const newId = generateUserId();
  cachedUserId = newId;

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem('jetzz_user_id', newId);
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }

  return newId;
};

export const clearUserId = async (): Promise<void> => {
  cachedUserId = null;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem('jetzz_user_id');
    } catch (error) {
      console.error('Error clearing user ID:', error);
    }
  }
};

export const initializeUserId = async (): Promise<void> => {
  await getUserId();
};
