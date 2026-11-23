import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import type { User, UserRole, AuthResponse } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  role: UserRole | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('voxguard_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('voxguard_token');
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const verifyAuth = async () => {
      const storedToken = localStorage.getItem('voxguard_token');
      if (storedToken) {
        try {
          const res = await api.get<User>('/auth/me');
          setUser(res.data);
          localStorage.setItem('voxguard_user', JSON.stringify(res.data));
        } catch {
          localStorage.removeItem('voxguard_token');
          localStorage.removeItem('voxguard_user');
          setUser(null);
          setToken(null);
        }
      }
      setIsLoading(false);
    };

    verifyAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.post<AuthResponse>('/auth/login', { email, password });
    const { access_token, user: loggedUser } = response.data;
    localStorage.setItem('voxguard_token', access_token);
    localStorage.setItem('voxguard_user', JSON.stringify(loggedUser));
    setToken(access_token);
    setUser(loggedUser);
  };

  const logout = async () => {
    try {
      if (token) {
        await api.post('/auth/logout');
      }
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      localStorage.removeItem('voxguard_token');
      localStorage.removeItem('voxguard_user');
      setUser(null);
      setToken(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        role: user ? user.role : null,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
