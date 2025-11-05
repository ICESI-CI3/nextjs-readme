import axios, { type AxiosResponse } from "axios";
import { URL_BASE } from "../constants/global";
import {
  GOOGLE_BOOKS_API,
  GOOGLE_BOOKS_API_KEY,
  GOOGLE_BOOKS_MAX_RESULTS,
  GOOGLE_BOOKS_TIMEOUT_MS,
} from "@/lib/googleBooksConfig";
import type { GoogleVolume } from "@/lib/googleBooks";

type AuthHeaders = {
  Authorization: string;
};

export type BookRecord = Record<string, unknown>;
export type GoogleBooksApiResponse = {
  items?: GoogleVolume[] | undefined;
  [key: string]: unknown;
};

const getToken = (): string | null =>
  typeof window === "undefined" ? null : localStorage.getItem("token");

const withAuthHeaders = (): Partial<AuthHeaders> => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const normalizeErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error)) {
    if (typeof error.response?.data === "string") {
      return error.response.data;
    }
    if (
      error.response?.data &&
      typeof error.response.data === "object" &&
      "message" in error.response.data
    ) {
      return String(error.response.data.message);
    }
    if (error.message) {
      return error.message;
    }
  } else if (error instanceof Error) {
    return error.message;
  }
  return fallback;
};

const handleRequest = async <T>(
  request: () => Promise<AxiosResponse<T>>,
  fallbackMessage: string
): Promise<AxiosResponse<T>> => {
  try {
    return await request();
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      return { data: [] as unknown as T } as AxiosResponse<T>;
    }
    throw new Error(normalizeErrorMessage(error, fallbackMessage));
  }
};

export const getAllBooks = async (): Promise<
  BookRecord | BookRecord[] | null
> => {
  const headers = withAuthHeaders();
  const { data } = await handleRequest<BookRecord | BookRecord[]>(
    () =>
      axios.get<BookRecord | BookRecord[]>(`${URL_BASE}/books`, {
        headers,
      }),
    "Unable to load books."
  );
  return (data ?? null) as BookRecord | BookRecord[] | null;
};

export const getBookByTitle = async (
  title: string
): Promise<BookRecord | BookRecord[] | null> => {
  const headers = withAuthHeaders();
  const { data } = await handleRequest<BookRecord | BookRecord[]>(
    () =>
      axios.get<BookRecord | BookRecord[]>(
        `${URL_BASE}/books/title/${title}`,
        { headers }
      ),
    "Unable to search books."
  );
  return (data ?? null) as BookRecord | BookRecord[] | null;
};

export const getBookById = async (
  id: string | number
): Promise<BookRecord | null> => {
  const headers = withAuthHeaders();
  const { data } = await handleRequest<BookRecord>(
    () =>
      axios.get<BookRecord>(`${URL_BASE}/books/${id}`, {
        headers,
      }),
    "Unable to load this book."
  );
  return (data ?? null) as BookRecord | null;
};

export const createBook = async (
  bookData: Record<string, unknown>
): Promise<BookRecord | null> => {
  const token = getToken();
  if (!token) return null;

  const { data } = await axios.post<BookRecord>(
    `${URL_BASE}/books`,
    bookData,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return (data ?? null) as BookRecord | null;
};

export const updateBook = async (
  identifier: string | number,
  updateData: Record<string, unknown>
): Promise<BookRecord | null> => {
  const token = getToken();
  if (!token) return null;

  const { data } = await axios.put<BookRecord>(
    `${URL_BASE}/books/${identifier}`,
    updateData,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return (data ?? null) as BookRecord | null;
};

export const deleteBook = async (
  identifier: string | number
): Promise<BookRecord | null> => {
  const token = getToken();
  if (!token) return null;

  const { data } = await axios.delete<BookRecord>(
    `${URL_BASE}/books/${identifier}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return (data ?? null) as BookRecord | null;
};

export const searchGoogleBooks = async ({
  query,
  searchBy = "title",
  startIndex = 0,
  maxResults = GOOGLE_BOOKS_MAX_RESULTS,
}: {
  query?: string;
  searchBy?: "title" | "isbn" | "author";
  startIndex?: number;
  maxResults?: number;
} = { query: "popular books" }): Promise<GoogleBooksApiResponse | null> => {
  const fallbackQuery = typeof query === "string" ? query : "popular books";
  const sanitizedQuery = fallbackQuery.trim() || "popular books";

  let q = sanitizedQuery;
  if (searchBy === "title") {
    q = `intitle:${sanitizedQuery}`;
  } else if (searchBy === "isbn") {
    q = `isbn:${sanitizedQuery}`;
  } else if (searchBy === "author") {
    q = `inauthor:${sanitizedQuery}`;
  }

  const params: Record<string, string | number> = {
    q,
    startIndex,
    maxResults: Math.min(Math.max(maxResults, 1), 40),
  };

  if (GOOGLE_BOOKS_API_KEY) {
    params.key = GOOGLE_BOOKS_API_KEY;
  }

  try {
    const { data } = await axios.get<
      GoogleBooksApiResponse | GoogleVolume[]
    >(GOOGLE_BOOKS_API, {
      params,
      timeout: GOOGLE_BOOKS_TIMEOUT_MS,
    });
    if (Array.isArray(data)) {
      return { items: data };
    }
    if (data && Array.isArray(data.items)) {
      return data;
    }
    return data ?? null;
  } catch (error) {
    throw new Error(
      normalizeErrorMessage(
        error,
        "Unable to search Google Books right now."
      )
    );
  }
};

export const getGoogleBookById = async (
  id: string
): Promise<GoogleVolume | null> => {
  try {
    const params = GOOGLE_BOOKS_API_KEY
      ? { key: GOOGLE_BOOKS_API_KEY }
      : undefined;
    const { data } = await axios.get<GoogleVolume>(
      `${GOOGLE_BOOKS_API}/${id}`,
      {
        params,
        timeout: GOOGLE_BOOKS_TIMEOUT_MS,
      }
    );
    return data ?? null;
  } catch (error) {
    throw new Error(
      normalizeErrorMessage(
        error,
        "Unable to load this Google Books title."
      )
    );
  }
};

export const importFromGoogle = async (
  googleData: Record<string, unknown>
): Promise<BookRecord | null> => {
  const token = getToken();
  if (!token) return null;

  try {
    const { data } = await axios.post<BookRecord>(
      `${URL_BASE}/books/import`,
      googleData,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return (data ?? null) as BookRecord | null;
  } catch (error) {
    if (
      axios.isAxiosError(error) &&
      (error.response?.status === 401 || error.response?.status === 403)
    ) {
      return null;
    }
    throw new Error(
      normalizeErrorMessage(
        error,
        "Unable to sync this book with the catalog."
      )
    );
  }
};
