import axios from 'axios';
import { URL_BASE } from '../constants/global';

const TOKEN_STORAGE_KEY = 'token';

const getAuthToken = () => (typeof window !== 'undefined' ? localStorage.getItem(TOKEN_STORAGE_KEY) : null);

const getAuthHeaders = () => {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Missing session token. Please log in again.');
  }
  return {
    Authorization: `Bearer ${token}`,
  };
};

const generateFallbackId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const coerceNumber = (value: unknown): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

type ApiMessage = {
  message?: string;
};

type RawUserStats = {
  id?: string | number;
  username?: string;
  email?: string;
  booksRead?: unknown;
  booksToRead?: unknown;
  reviewsCount?: unknown;
};

export type UserStatsReport = {
  id: string;
  username: string;
  email: string;
  booksRead: number;
  booksToRead: number;
  reviewsCount: number;
};

export type MostReadBookReport = {
  title: string;
  reads: number;
};

export type MostCommentedBookReport = {
  title: string;
  comments: number;
};

export type TopReaderReport = {
  username: string;
  booksRead: number;
};

export const fetchUserStatsReport = async (): Promise<UserStatsReport[]> => {
  const { data } = await axios.get<RawUserStats[] | ApiMessage>(`${URL_BASE}/reports/users-stats`, {
    headers: getAuthHeaders(),
  });

  if (!Array.isArray(data)) {
    return [];
  }

  return data.map((item): UserStatsReport => {
    const idRaw = item.id ?? generateFallbackId();
    return {
      id: String(idRaw),
      username: item.username ?? 'Unknown user',
      email: item.email ?? 'Unknown email',
      booksRead: coerceNumber(item.booksRead),
      booksToRead: coerceNumber(item.booksToRead),
      reviewsCount: coerceNumber(item.reviewsCount),
    };
  });
};

const isMessageResponse = (payload: unknown): payload is ApiMessage =>
  !!payload && typeof payload === 'object' && 'message' in payload;

export const fetchMostReadBookReport = async (): Promise<MostReadBookReport | null> => {
  const { data } = await axios.get<Record<string, unknown> | ApiMessage>(
    `${URL_BASE}/reports/most-read-book`,
    { headers: getAuthHeaders() },
  );

  if (!data || isMessageResponse(data)) {
    return null;
  }

  const title = typeof data.title === 'string' && data.title.trim().length ? data.title : 'No book found';
  const reads = coerceNumber(data.reads);
  return { title, reads };
};

export const fetchMostCommentedBookReport = async (): Promise<MostCommentedBookReport | null> => {
  const { data } = await axios.get<Record<string, unknown> | ApiMessage>(
    `${URL_BASE}/reports/most-commented-book`,
    { headers: getAuthHeaders() },
  );

  if (!data || isMessageResponse(data)) {
    return null;
  }

  const title = typeof data.title === 'string' && data.title.trim().length ? data.title : 'No book found';
  const comments = coerceNumber(data.comments);
  return { title, comments };
};

export const fetchTopReaderReport = async (): Promise<TopReaderReport | null> => {
  const { data } = await axios.get<Record<string, unknown> | ApiMessage>(
    `${URL_BASE}/reports/top-reader`,
    { headers: getAuthHeaders() },
  );

  if (!data || isMessageResponse(data)) {
    return null;
  }

  const username =
    typeof data.username === 'string' && data.username.trim().length ? data.username : 'No reader found';
  const booksRead = coerceNumber(data.booksRead);
  return { username, booksRead };
};
