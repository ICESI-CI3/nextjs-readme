'use client';

import axios from 'axios';
import { URL_BASE } from '@/constants/global';
import { useAuthStore } from '@/stores/authStore';

export const resolveAuthToken = (): string | null => {
  const tokenFromStore = useAuthStore.getState().token;
  if (tokenFromStore) return tokenFromStore;
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

const apiClient = axios.create({
  baseURL: URL_BASE,
});

apiClient.interceptors.request.use(
  (config) => {
    const token = resolveAuthToken();
    if (token) {
      const existingHeaders = config.headers;
      const isAxiosHeaders =
        existingHeaders &&
        typeof (existingHeaders as { set?: unknown }).set === 'function';

      if (isAxiosHeaders) {
        const axiosHeaders = existingHeaders as {
          set: (key: string, value: string) => void;
          has?: (key: string) => boolean;
          get?: (key: string) => string | null;
        };
        const hasAuthorization =
          (typeof axiosHeaders.has === 'function' && axiosHeaders.has('Authorization')) ||
          (typeof axiosHeaders.get === 'function' &&
            Boolean(axiosHeaders.get('Authorization')));

        if (!hasAuthorization) {
          axiosHeaders.set('Authorization', `Bearer ${token}`);
        }
      } else {
        const headers = (existingHeaders ?? {}) as Record<string, unknown>;
        if (!headers.Authorization) {
          headers.Authorization = `Bearer ${token}`;
        }
        config.headers = headers;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

export default apiClient;
