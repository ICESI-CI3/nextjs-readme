import axios from "axios";
import { URL_BASE } from "../constants/global";
import {
  GOOGLE_BOOKS_API,
  GOOGLE_BOOKS_API_KEY,
  GOOGLE_BOOKS_MAX_RESULTS,
  GOOGLE_BOOKS_TIMEOUT_MS,
} from "@/lib/googleBooksConfig";

const getToken = () => (
  typeof window === "undefined" ? null : localStorage.getItem("token")
);

const withAuthHeaders = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const normalizeErrorMessage = (error, fallback) => {
  if (axios.isAxiosError(error)) {
    if (typeof error.response?.data === "string") {
      return error.response.data;
    }
    if (error.response?.data && typeof error.response.data === "object" && "message" in error.response.data) {
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

const handleRequest = async (request, fallbackMessage) => {
  try {
    return await request();
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      return { data: [] };
    }
    throw new Error(normalizeErrorMessage(error, fallbackMessage));
  }
};

export const getAllBooks = async () => {
  const headers = withAuthHeaders();
  const { data } = await handleRequest(
    () => axios.get(`${URL_BASE}/books`, { headers }),
    "Unable to load books."
  );
  return data;
};

export const getBookByTitle = async (title) => {
  const headers = withAuthHeaders();
  const { data } = await handleRequest(
    () => axios.get(`${URL_BASE}/books/title/${title}`, { headers }),
    "Unable to search books."
  );
  return data;
};

export const getBookById = async (id) => {
  const headers = withAuthHeaders();
  const { data } = await handleRequest(
    () => axios.get(`${URL_BASE}/books/${id}`, { headers }),
    "Unable to load this book."
  );
  return data;
};

export const createBook = async (bookData) => {
  const token = getToken();
  if (!token) return null;

  const { data } = await axios.post(`${URL_BASE}/books`, bookData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const updateBook = async (title, updateData) => {
  const token = getToken();
  if (!token) return null;

  const { data } = await axios.put(`${URL_BASE}/books/${title}`, updateData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const deleteBook = async (title) => {
  const token = getToken();
  if (!token) return null;

  const { data } = await axios.delete(`${URL_BASE}/books/${title}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const searchGoogleBooks = async ({
  query,
  searchBy = "title",
  startIndex = 0,
  maxResults = GOOGLE_BOOKS_MAX_RESULTS,
} = { query: "popular books" }) => {
  const sanitizedQuery = (query ?? "popular books").trim() || "popular books";

  let q = sanitizedQuery;
  if (searchBy === "title") {
    q = `intitle:${sanitizedQuery}`;
  } else if (searchBy === "isbn") {
    q = `isbn:${sanitizedQuery}`;
  } else if (searchBy === "author") {
    q = `inauthor:${sanitizedQuery}`;
  }

  const params = {
    q,
    startIndex,
    maxResults: Math.min(Math.max(maxResults, 1), 40),
  };

  if (GOOGLE_BOOKS_API_KEY) {
    params.key = GOOGLE_BOOKS_API_KEY;
  }

  try {
    const { data } = await axios.get(GOOGLE_BOOKS_API, {
      params,
      timeout: GOOGLE_BOOKS_TIMEOUT_MS,
    });
    return data;
  } catch (error) {
    throw new Error(normalizeErrorMessage(error, "Unable to search Google Books right now."));
  }
};

export const getGoogleBookById = async (id) => {
  try {
    const params = GOOGLE_BOOKS_API_KEY ? { key: GOOGLE_BOOKS_API_KEY } : undefined;
    const { data } = await axios.get(`${GOOGLE_BOOKS_API}/${id}`, {
      params,
      timeout: GOOGLE_BOOKS_TIMEOUT_MS,
    });
    return data;
  } catch (error) {
    throw new Error(normalizeErrorMessage(error, "Unable to load this Google Books title."));
  }
};

export const importFromGoogle = async (googleData) => {
  const token = getToken();
  if (!token) return null;

  try {
    const { data } = await axios.post(`${URL_BASE}/books/import`, googleData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return data;
  } catch (error) {
    if (
      axios.isAxiosError(error) &&
      (error.response?.status === 401 || error.response?.status === 403)
    ) {
      return null;
    }
    throw new Error(normalizeErrorMessage(error, "Unable to sync this book with the catalog."));
  }
};
