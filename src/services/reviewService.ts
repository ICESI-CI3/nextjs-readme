import apiClient, { resolveAuthToken } from "./apiClient";

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

const toPathSegment = (value: string | number): string =>
  encodeURIComponent(String(value));

export const getReviews = async (): Promise<ReviewRecord[] | null> => {
  if (!resolveAuthToken()) return null;

  const { data } = await apiClient.get<ReviewRecord[]>('/reviews');
  return (data ?? null) as ReviewRecord[] | null;
};

export const createReview = async (
  review: ReviewPayload
): Promise<ReviewRecord | null> => {
  if (!resolveAuthToken()) return null;

  const { data } = await apiClient.post<ReviewRecord>(
    '/reviews',
    review
  );

  return (data ?? null) as ReviewRecord | null;
};

export const getReviewById = async (
  id: string | number
): Promise<ReviewRecord | null> => {
  if (!resolveAuthToken()) return null;

  const { data } = await apiClient.get<ReviewRecord>(
    `/reviews/${toPathSegment(id)}`
  );
  return (data ?? null) as ReviewRecord | null;
};

export const getReviewsByBook = async (
  bookId: string | number
): Promise<ReviewRecord[] | null> => {
  if (!resolveAuthToken()) return null;

  const { data } = await apiClient.get<ReviewRecord[]>(
    `/reviews/book/${toPathSegment(bookId)}`
  );
  return (data ?? null) as ReviewRecord[] | null;
};

export const updateReview = async (
  id: string | number,
  review: ReviewPayload
): Promise<ReviewRecord | null> => {
  if (!resolveAuthToken()) return null;

  const { data } = await apiClient.put<ReviewRecord>(
    `/reviews/${toPathSegment(id)}`,
    review
  );
  return (data ?? null) as ReviewRecord | null;
};

export const deleteReview = async (
  id: string | number
): Promise<boolean | null> => {
  if (!resolveAuthToken()) return null;

  await apiClient.delete(`/reviews/${toPathSegment(id)}`);
  console.log(`Review ${id} eliminada correctamente`);
  return true;
};
