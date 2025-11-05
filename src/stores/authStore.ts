'use client';

import { create } from 'zustand';
import { loginUser, getProfile, logoutUser } from '@/services/userService';
import type { AuthUser } from '@/services/userService';

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
  logout: () => Promise<void>;
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

const isAuthUser = (value: unknown): value is AuthUser => {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
};

const normalizeAuthUser = (value: unknown): AuthUser | null => {
  if (isAuthUser(value)) {
    return value;
  }
  if (value && typeof value === 'object' && 'user' in value) {
    const nested = (value as { user?: unknown }).user;
    if (isAuthUser(nested)) {
      return nested;
    }
  }
  return null;
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
      const resolvedUser = normalizeAuthUser(profile);
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

      let userCandidate: unknown = response?.user ?? null;
      if (!userCandidate) {
        try {
          userCandidate = await getProfile();
        } catch {
          userCandidate = null;
        }
      }

      const resolvedUser = normalizeAuthUser(userCandidate);
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
  async logout() {
    set({ status: 'loading', error: null });
    try {
      await logoutUser();
    } catch (error) {
      console.error('Logout request failed', error);
    } finally {
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
    }
  },
  setUser(user) {
    const role = user?.role ? String(user.role) : null;
    setRoleCookie(role);
    set({ user });
  },
}));
