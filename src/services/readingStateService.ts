// src/services/readingStateService.ts
import axios from 'axios';
import { URL_BASE } from '../constants/global';

type UiStatus = 'to-read' | 'reading' | 'completed';
type ApiStatus = 'pending' | 'reading' | 'read';

const uiToApiStatus = (s: UiStatus): ApiStatus =>
  s === 'to-read' ? 'pending' : s === 'completed' ? 'read' : 'reading';

const getAuthToken = () =>
  typeof window === 'undefined' ? null : localStorage.getItem('token');

const authHeaders = () => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ===== New: Upsert using googleId (backend will import if needed)
export async function upsertReadingState(params: {
  userId: string;
  googleId: string;
  uiStatus: UiStatus;
}) {
  const token = getAuthToken();
  if (!token) return null;

  const body = {
    userId: params.userId,
    googleId: params.googleId,
    state: uiToApiStatus(params.uiStatus),
    // notes?: string  // add only if your DTO allows it
  };

  const { data } = await axios.post(
    `${URL_BASE}/reading-states/upsert`,
    body,
    { headers: authHeaders() }
  );
  return data as {
    id: string;
    state: ApiStatus;
    book: { id: string };
  };
}

// ===== Your existing functions (kept as-is, typed)
type ReadingStateCreatePayload = {
  status: UiStatus | ApiStatus | string;
  bookId?: string | number;
  googleId?: string;
  userId?: string | number;
  notes?: string;
  [key: string]: unknown;
};

type ReadingStateUpdatePayload = {
  status?: UiStatus | ApiStatus | string;
  notes?: string | null;
  [key: string]: unknown;
};

export const createReadingState = async (readingStateData: ReadingStateCreatePayload) => {
  const token = getAuthToken();
  if (!token) return null;

  const { data } = await axios.post(
    `${URL_BASE}/reading-states`,
    readingStateData,
    { headers: authHeaders() }
  );
  return data;
};

export const getAllReadingStates = async () => {
  const token = getAuthToken();
  if (!token) return null;

  const { data } = await axios.get(`${URL_BASE}/reading-states`, {
    headers: authHeaders(),
  });
  return data;
};

export const getReadingStatesByUser = async (userId: string) => {
  const token = getAuthToken();
  if (!token) return null;

  const { data } = await axios.get(
    `${URL_BASE}/reading-states/user/${userId}`,
    { headers: authHeaders() }
  );
  return data;
};

export const updateReadingState = async (id: string, updateData: ReadingStateUpdatePayload) => {
  const token = getAuthToken();
  if (!token) return null;

  const { data } = await axios.patch(
    `${URL_BASE}/reading-states/${id}`,
    updateData,
    { headers: authHeaders() }
  );
  return data;
};

export const deleteReadingState = async (id: string) => {
  const token = getAuthToken();
  if (!token) return null;

  const { data } = await axios.delete(
    `${URL_BASE}/reading-states/${id}`,
    { headers: authHeaders() }
  );
  return data;
};
