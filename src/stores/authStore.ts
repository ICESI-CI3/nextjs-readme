'use client';

import { create } from 'zustand';
import { loginUser, getProfile } from '@/services/userService';

type AuthUser = {
  id?: string | number;
  name?: string;
  email?: string;
  role?: string;
  [key: string]: unknown;
};

type Credentials = {
  email: string;
  password: string;
};

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated' | 'error';
  error: string | null;
  initialized: boolean;
  initialize: () => Promise<void>;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => void;
  setUser: (user: AuthUser | null) => void;
};

const TOKEN_KEY = 'token';

const setAuthCookie = (token: string | null) => {
  if (typeof document === 'undefined') return;
  if (token) {
    document.cookie = `token=${token}; path=/; max-age=${60 * 60 * 24 * 7}`;
  } else {
    document.cookie = 'token=; path=/; max-age=0';
  }
};

const setRoleCookie = (role: string | null) => {
  if (typeof document === 'undefined') return;
  if (role) {
    document.cookie = `role=${role}; path=/; max-age=${60 * 60 * 24 * 7}`;
  } else {
    document.cookie = 'role=; path=/; max-age=0';
  }
};

const getErrorMessage = (error: unknown) => {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } | string } }).response;
    if (typeof response?.data === 'string') return response.data;
    if (response?.data && typeof response.data === 'object' && 'message' in response.data) {
      return String(response.data.message);
    }
  }
  if (error instanceof Error) return error.message;
  return 'Unexpected error, please try again.';
};

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  status: 'idle',
  error: null,
  initialized: false,
  async initialize() {
    if (get().initialized) return;
    if (typeof window === 'undefined') return;
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (!storedToken) {
      setAuthCookie(null);
      set({
        token: null,
        user: null,
        status: 'unauthenticated',
        error: null,
        initialized: true,
      });
      return;
    }

    set({ status: 'loading', token: storedToken, error: null });

    try {
      const profile = await getProfile();
      const resolvedUser = profile?.user ?? profile ?? null;
      const role = resolvedUser?.role ? String(resolvedUser.role) : null;
      setRoleCookie(role);
      set({
        token: storedToken,
        user: resolvedUser,
        status: 'authenticated',
        error: null,
        initialized: true,
      });
    } catch (error) {
      localStorage.removeItem(TOKEN_KEY);
      setAuthCookie(null);
      setRoleCookie(null);
      set({
        token: null,
        user: null,
        status: 'unauthenticated',
        error: getErrorMessage(error),
        initialized: true,
      });
    }
  },
  async login(credentials) {
    set({ status: 'loading', error: null });
    try {
      const response = await loginUser(credentials);
      const token =
        response?.token ?? (typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null);
      if (token) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(TOKEN_KEY, token);
        }
        setAuthCookie(token);
      }

      let user = response?.user ?? null;
      if (!user) {
        try {
          user = await getProfile();
        } catch {
          // tolerate profile failure here; user remains null
        }
      }

      const resolvedUser = user?.user ?? user ?? null;
      const role = resolvedUser?.role ? String(resolvedUser.role) : null;
      setRoleCookie(role);

      set({
        token: token ?? null,
        user: resolvedUser,
        status: token ? 'authenticated' : 'unauthenticated',
        error: token ? null : 'Missing session token.',
        initialized: true,
      });

      if (!token) {
        throw new Error('Missing session token.');
      }
    } catch (error) {
      const message = getErrorMessage(error);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(TOKEN_KEY);
      }
      setAuthCookie(null);
      setRoleCookie(null);
      set({
        token: null,
        user: null,
        status: 'error',
        error: message,
        initialized: true,
      });
      throw new Error(message);
    }
  },
  logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
    }
    setAuthCookie(null);
    setRoleCookie(null);
    set({
      token: null,
      user: null,
      status: 'unauthenticated',
      error: null,
      initialized: true,
    });
  },
  setUser(user) {
    const role = user?.role ? String(user.role) : null;
    setRoleCookie(role);
    set({ user });
  },
}));
