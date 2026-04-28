"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import Cookies from 'js-cookie';
import axios from 'axios';
import { useRouter } from 'next/navigation';


const ROLE_REDIRECTS: Record<string, string> = {
  WAREHOUSE_SUPPERVISOR: '/distributorManager',
  WAREHOUSE_CUSTOMER: '/distributorDashboard',
  ACCOUNTANT: '/accountsDashboard',
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

// Detect HTTPS at runtime so cookies work on both HTTP (local/server without SSL)
// and HTTPS (production with SSL). Using NODE_ENV broke server deployments on HTTP.
function buildCookieOptions() {
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  return {
    expires: 7,
    secure: isHttps,
    sameSite: 'lax' as const,
    path: '/',
  };
}

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
    const removePath = { path: '/' };
    Cookies.remove('virtue_token', removePath);
    Cookies.remove('virtue_user', removePath);
    Cookies.remove('user_id', removePath);
    Cookies.remove('userId', removePath);
    Cookies.remove('auth_token', removePath);
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

          // Re-set legacy cookies if missing (uses same options for consistency)
          const cookieOpts = buildCookieOptions();
          const uid = String(parsedUser.user_id || parsedUser.id || "");
          if (!Cookies.get('user_id'))    Cookies.set('user_id',    uid,        cookieOpts);
          if (!Cookies.get('userId'))     Cookies.set('userId',     uid,        cookieOpts);
          if (!Cookies.get('auth_token')) Cookies.set('auth_token', savedToken, cookieOpts);
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
    const userRole = userData.role?.trim();

    console.log(userData);
    setToken(newToken);
    setUser(userData);
    setRole(userRole);

    // Set Cookies
    const cookieOptions = buildCookieOptions();
    Cookies.set('virtue_token', newToken, cookieOptions);
    Cookies.set('virtue_user', JSON.stringify(userData), cookieOptions);
    // Legacy support for different dashboard pages
    const uid = String(userData.user_id || userData.id || "");
    Cookies.set('user_id',    uid, cookieOptions);
    Cookies.set('userId',     uid, cookieOptions);
    // Also save as auth_token so all accountsDashboard pages (which use Cookies.get('auth_token')) work
    Cookies.set('auth_token', newToken, cookieOptions);

    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

   
    const targetPath = ROLE_REDIRECTS[userRole as keyof typeof ROLE_REDIRECTS];

    if (targetPath) {
      console.log(`[AUTH] Route Found: ${targetPath}`);
      router.push(targetPath);
    } else {
      
      console.error(`[AUTH_ERROR] Role "${userRole}" is not defined in ROLE_REDIRECTS map!`);
      
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