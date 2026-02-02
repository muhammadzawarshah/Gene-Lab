"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import Cookies from 'js-cookie';
import axios from 'axios';
import { useRouter } from 'next/navigation';

// --- ROLE-BASED DYNAMIC ROUTING MAP ---
const ROLE_REDIRECTS: Record<string, string> = {
  WAREHOUSE_SUPPERVISOR: '/distributorManager',
  WAREHOUSE_CUSTOMER: '/distributorDashboard',
  ACCOUNTANT: '/accountsDashboard',
  // Note: Yahan 'default' nahi hai as per your request.
};

interface AuthContextType {
  user: any;
  token: string | null;
  role: string | null;
  login: (token: string, userData: any) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setRole(null);
    Cookies.remove('virtue_token');
    Cookies.remove('virtue_user');
    delete axios.defaults.headers.common['Authorization'];
    router.replace('/login');
  }, [router]);

  useEffect(() => {
    const initializeAuth = () => {
      const savedToken = Cookies.get('virtue_token');
      const savedUser = Cookies.get('virtue_user');

      if (savedToken && savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          setToken(savedToken);
          setUser(parsedUser);
          setRole(parsedUser.role);
          axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
        } catch (e) {
          logout();
        }
      }
      setIsLoading(false);
    };
    initializeAuth();
  }, [logout]);

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (res) => res,
      (err) => {
        if (err.response?.status === 401) logout();
        return Promise.reject(err);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, [logout]);

  const login = (newToken: string, userData: any) => {
    const userRole = userData.role; // No fallback to 'default' string

    // Update States
    setToken(newToken);
    setUser(userData);
    setRole(userRole);

    // Set Cookies
    const cookieOptions = { 
      expires: 7, 
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const 
    };
    Cookies.set('virtue_token', newToken, cookieOptions);
    Cookies.set('virtue_user', JSON.stringify(userData), cookieOptions);

    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

    // --- DYNAMIC REDIRECT LOGIC ---
    const targetPath = ROLE_REDIRECTS[userRole as keyof typeof ROLE_REDIRECTS];

    if (targetPath) {
      console.log(`[AUTH] Route Found: ${targetPath}`);
      router.push(targetPath);
    } else {
      // Masla yahan pakra jayega agar backend se galat role aaya
      console.error(`[AUTH_ERROR] Role "${userRole}" is not defined in ROLE_REDIRECTS map!`);
      // Alert user or stay on login but don't push undefined
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, role, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};