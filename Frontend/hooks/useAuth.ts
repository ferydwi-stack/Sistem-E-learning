import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { User } from '@/types/models';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  me: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('lms_user');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          return parsed?.user || parsed?.data || parsed;
        } catch { }
      }
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(false);

  const fetchUser = useCallback(async () => {
    try {
      const userData = await api.me();
      if (userData) {
        setUser((userData as any)?.user || (userData as any)?.data || userData);
      }
    } catch {
      // keep cached user if network fails
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      await api.login(email, password);
      const userData = await api.me();
      setUser(userData as any);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await api.logout();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('lms_token');
    if (token) {
      fetchUser();
    } else {
      setIsLoading(false);
    }
  }, [fetchUser]);

  useEffect(() => {
    const handleUserUpdate = () => {
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('lms_user');
        if (cached) {
          try { setUser(JSON.parse(cached)); } catch { }
        }
      }
    };

    window.addEventListener('lms_user_updated', handleUserUpdate);
    window.addEventListener('storage', handleUserUpdate);
    return () => {
      window.removeEventListener('lms_user_updated', handleUserUpdate);
      window.removeEventListener('storage', handleUserUpdate);
    };
  }, []);

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    me: fetchUser,
  };
}
