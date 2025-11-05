'use client';

import axios, { AxiosHeaders } from 'axios';
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
      const headers = AxiosHeaders.from(config.headers ?? undefined);
      const currentAuth = headers.get('Authorization');
      if (!currentAuth) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      config.headers = headers;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

export default apiClient;
