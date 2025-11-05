import axios from "axios";
import { URL_BASE } from "../constants/global";

type ReviewPayload = Record<string, unknown>;

export type ReviewRecord = {
  id?: string | number;
  rating?: number;
  comment?: string;
  text?: string;
  status?: string;
  bookId?: string | number;
  userId?: string | number;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

const getToken = (): string | null =>
  typeof window === "undefined" ? null : localStorage.getItem("token");

const getAuthHeaders = (): { Authorization: string } | null => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : null;
};

export const getReviews = async (): Promise<ReviewRecord[] | null> => {
  const headers = getAuthHeaders();
  if (!headers) return null;

  const { data } = await axios.get<ReviewRecord[]>(`${URL_BASE}/reviews`, {
    headers,
  });
  return (data ?? null) as ReviewRecord[] | null;
};

export const createReview = async (
  review: ReviewPayload
): Promise<ReviewRecord | null> => {
  const headers = getAuthHeaders();
  if (!headers) return null;

  const { data } = await axios.post<ReviewRecord>(
    `${URL_BASE}/reviews`,
    review,
    {
      headers,
    }
  );

  return (data ?? null) as ReviewRecord | null;
};

export const getReviewById = async (
  id: string | number
): Promise<ReviewRecord | null> => {
  const headers = getAuthHeaders();
  if (!headers) return null;

  const { data } = await axios.get<ReviewRecord>(
    `${URL_BASE}/reviews/${id}`,
    {
      headers,
    }
  );
  return (data ?? null) as ReviewRecord | null;
};

export const getReviewsByBook = async (
  bookId: string | number
): Promise<ReviewRecord[] | null> => {
  const headers = getAuthHeaders();
  if (!headers) return null;

  const { data } = await axios.get<ReviewRecord[]>(
    `${URL_BASE}/reviews/book/${bookId}`,
    {
      headers,
    }
  );
  return (data ?? null) as ReviewRecord[] | null;
};

export const updateReview = async (
  id: string | number,
  review: ReviewPayload
): Promise<ReviewRecord | null> => {
  const headers = getAuthHeaders();
  if (!headers) return null;

  const { data } = await axios.put<ReviewRecord>(
    `${URL_BASE}/reviews/${id}`,
    review,
    {
      headers,
    }
  );
  return (data ?? null) as ReviewRecord | null;
};

export const deleteReview = async (
  id: string | number
): Promise<boolean | null> => {
  const headers = getAuthHeaders();
  if (!headers) return null;

  await axios.delete(`${URL_BASE}/reviews/${id}`, {
    headers,
  });
  console.log(`Review ${id} eliminada correctamente`);
  return true;
};
