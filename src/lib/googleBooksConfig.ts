export const GOOGLE_BOOKS_API = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API ?? 'https://www.googleapis.com/books/v1/volumes';
export const GOOGLE_BOOKS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY ?? '';
export const GOOGLE_BOOKS_MAX_RESULTS = Number(process.env.NEXT_PUBLIC_GOOGLE_BOOKS_MAX_RESULTS ?? '12');

const GOOGLE_TIMEOUT_FALLBACK = 12000;
const parsedTimeout = Number(process.env.NEXT_PUBLIC_GOOGLE_BOOKS_TIMEOUT_MS);

export const GOOGLE_BOOKS_TIMEOUT_MS = Number.isFinite(parsedTimeout) && parsedTimeout > 0
  ? parsedTimeout
  : GOOGLE_TIMEOUT_FALLBACK;
