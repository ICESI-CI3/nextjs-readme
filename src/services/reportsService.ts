import apiClient, { resolveAuthToken } from './apiClient';

const ensureAuth = () => {
  const token = resolveAuthToken();
  if (!token) {
    throw new Error('Missing session token. Please log in again.');
  }
  return token;
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
  ensureAuth();
  const { data } = await apiClient.get<RawUserStats[] | ApiMessage>(
    '/reports/users-stats'
  );

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
  ensureAuth();
  const { data } = await apiClient.get<Record<string, unknown> | ApiMessage>(
    '/reports/most-read-book',
  );

  if (!data || isMessageResponse(data)) {
    return null;
  }

  const title = typeof data.title === 'string' && data.title.trim().length ? data.title : 'No book found';
  const reads = coerceNumber(data.reads);
  return { title, reads };
};

export const fetchMostCommentedBookReport = async (): Promise<MostCommentedBookReport | null> => {
  ensureAuth();
  const { data } = await apiClient.get<Record<string, unknown> | ApiMessage>(
    '/reports/most-commented-book',
  );

  if (!data || isMessageResponse(data)) {
    return null;
  }

  const title = typeof data.title === 'string' && data.title.trim().length ? data.title : 'No book found';
  const comments = coerceNumber(data.comments);
  return { title, comments };
};

export const fetchTopReaderReport = async (): Promise<TopReaderReport | null> => {
  ensureAuth();
  const { data } = await apiClient.get<Record<string, unknown> | ApiMessage>(
    '/reports/top-reader',
  );

  if (!data || isMessageResponse(data)) {
    return null;
  }

  const username =
    typeof data.username === 'string' && data.username.trim().length ? data.username : 'No reader found';
  const booksReadValue =
    'booksRead' in data
      ? (data as Record<string, unknown>).booksRead
      : 'booksread' in data
        ? (data as Record<string, unknown>).booksread
        : 'count' in data
          ? (data as Record<string, unknown>).count
          : undefined;
  const booksRead = coerceNumber(booksReadValue);
  return { username, booksRead };
};
