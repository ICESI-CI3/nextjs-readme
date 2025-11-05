'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Input from '@/components/Form/Input';
import Toast from '@/components/Toast';
import { useAuthStore } from '@/stores/authStore';
import { getAllBooks, getBookByTitle, searchGoogleBooks } from '@/services/bookService';
import BookCard from '@/components/Books/BookCard';

type Book = {
  id: string;
  title?: string;
  authors?: string[];
  isbn?: string;
  thumbnailUrl?: string | null;
  status?: string;
  description?: string;
  publishedDate?: string;
  source: 'local' | 'google';
};

type GoogleVolume = {
  id?: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    industryIdentifiers?: Array<{ type?: string; identifier?: string }>;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
    description?: string;
    publishedDate?: string;
    printType?: string;
  };
};

const PAGE_SIZE = 8;
const DEFAULT_GOOGLE_QUERY = 'popular books';

const normalizeAuthors = (value: unknown): string[] | undefined => {
  if (Array.isArray(value)) {
    const normalized = value
      .map((entry) =>
        typeof entry === 'string'
          ? entry.trim()
          : typeof entry === 'number'
            ? String(entry)
            : ''
      )
      .filter(Boolean);
    return normalized.length ? normalized : undefined;
  }
  if (typeof value === 'string') {
    const normalized = value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
    return normalized.length ? normalized : undefined;
  }
  return undefined;
};

const resolveId = (value: unknown, fallbackPrefix: string): string => {
  if (value !== undefined && value !== null) {
    const str = String(value).trim();
    if (str.length) {
      return str;
    }
  }
  return `${fallbackPrefix}-${Math.random().toString(36).slice(2)}`;
};

const mapBackendBook = (book: Record<string, unknown>): Book => {
  const id = resolveId(book.id ?? book.isbn ?? book.title, 'local');

  return {
    id,
    title: typeof book.title === 'string' ? book.title : undefined,
    authors: normalizeAuthors(book.authors),
    isbn: typeof book.isbn === 'string' ? book.isbn : undefined,
    thumbnailUrl:
      typeof book.thumbnailUrl === 'string'
        ? book.thumbnailUrl
        : typeof book.cover === 'string'
          ? book.cover
          : null,
    status: typeof book.status === 'string' ? book.status : undefined,
    description:
      typeof book.description === 'string' ? book.description : undefined,
    publishedDate:
      typeof book.publishedDate === 'string' ? book.publishedDate : undefined,
    source: 'local',
  };
};

const mapGoogleVolume = (volume: GoogleVolume): Book => {
  const info = volume.volumeInfo ?? {};
  const authors = Array.isArray(info.authors) ? info.authors : undefined;
  const identifiers = Array.isArray(info.industryIdentifiers) ? info.industryIdentifiers : [];
  const primaryIsbn = identifiers.find((item) => item?.type?.toLowerCase().includes('isbn13'))?.identifier ??
    identifiers.find((item) => item?.type?.toLowerCase().includes('isbn10'))?.identifier;
  const cover = info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail ?? undefined;

  return {
    id: resolveId(volume.id, 'google'),
    title: info.title ?? 'Untitled',
    authors,
    isbn: primaryIsbn,
    thumbnailUrl: cover ?? null,
    status: info.printType ?? undefined,
    description: info.description ?? undefined,
    publishedDate: info.publishedDate ?? undefined,
    source: 'google',
  };
};

const BooksPage = () => {
  const role = useAuthStore((state) => state.user?.role ?? 'reader');
  const normalizedRole = (role ?? 'reader').toString().toLowerCase();
  const isAdmin = normalizedRole === 'admin';

  const [books, setBooks] = useState<Book[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [localResult, googleResult] = await Promise.allSettled([
          getAllBooks(),
          searchGoogleBooks({ query: DEFAULT_GOOGLE_QUERY, maxResults: 24 }),
        ]);

        if (!active) return;

        const localEntries =
          localResult.status === 'fulfilled'
            ? Array.isArray(localResult.value)
              ? localResult.value
              : localResult.value
                ? [localResult.value]
                : []
            : [];
        const mappedLocal = localEntries
          .filter(
            (item): item is Record<string, unknown> =>
              item !== null && typeof item === 'object'
          )
          .map(mapBackendBook);

        const googleItems =
          googleResult.status === 'fulfilled' && googleResult.value
            ? Array.isArray(googleResult.value.items)
              ? googleResult.value.items
              : []
            : [];
        const mappedGoogle = googleItems.map(mapGoogleVolume);

        const combined = [...mappedLocal, ...mappedGoogle];
        setBooks(combined);
        setFilteredBooks(combined);

        const failures: string[] = [];
        if (localResult.status === 'rejected') {
          console.error('Unable to load library catalog books', localResult.reason);
          failures.push('library catalog');
        }
        if (googleResult.status === 'rejected') {
          console.error('Unable to load Google Books titles', googleResult.reason);
          failures.push('Google Books');
        }

        if (failures.length === 2) {
          setError('Unable to load books at the moment.');
        } else if (failures.length === 1) {
          setError(`Unable to load ${failures[0]} titles. Showing available results.`);
        } else if (!combined.length) {
          setError('No books available right now.');
        }
      } catch (err) {
        console.error('Unable to load books', err);
        if (!active) return;
        setBooks([]);
        setFilteredBooks([]);
        setError('Unable to load books at the moment.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [normalizedRole]);

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearching(true);
    setError(null);
    try {
      const term = searchTerm.trim();
      if (!term) {
        setFilteredBooks(books);
        setPage(1);
        return;
      }

      const [localResult, googleResult] = await Promise.allSettled([
        getBookByTitle(term),
        searchGoogleBooks({
          query: term,
          searchBy: 'title',
          maxResults: 24,
        }),
      ]);

      const aggregated: Book[] = [];
      let partial = false;

      if (localResult.status === 'fulfilled') {
        const normalized = Array.isArray(localResult.value)
          ? localResult.value
          : localResult.value
            ? [localResult.value]
            : [];
        const mapped = normalized
          .filter(
            (item): item is Record<string, unknown> =>
              item !== null && typeof item === 'object'
          )
          .map(mapBackendBook);
        aggregated.push(...mapped);
      } else {
        console.error('Local catalog search failed', localResult.reason);
        partial = true;
      }

      if (googleResult.status === 'fulfilled' && googleResult.value) {
        const items = Array.isArray(googleResult.value.items) ? googleResult.value.items : [];
        aggregated.push(...items.map(mapGoogleVolume));
      } else if (googleResult.status === 'rejected') {
        console.error('Google Books search failed', googleResult.reason);
        partial = true;
      }

      setFilteredBooks(aggregated);
      setPage(1);

      if (!aggregated.length) {
        setError('No books found for that search.');
      } else if (partial) {
        setError('Showing partial results due to a search error.');
      }
    } catch (err) {
      console.error('Search failed', err);
      setError('Search failed. Try a different term.');
    } finally {
      setSearching(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(filteredBooks.length / PAGE_SIZE));

  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredBooks.slice(start, start + PAGE_SIZE);
  }, [filteredBooks, page]);

  const handleClear = () => {
    setSearchTerm('');
    setError(null);
    setPage(1);
    setFilteredBooks(books);
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Books</h1>
          <p className="text-sm text-slate-500">
            {isAdmin
              ? 'Manage the library catalog, track statuses, and add new titles.'
              : 'Browse the Google Books catalog to find your next read.'}
          </p>
        </div>
        {isAdmin ? (
          <Link
            href="/books/new"
            className="inline-flex h-11 items-center rounded-md bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Add new book
          </Link>
        ) : (
          <Link
            href="/reading"
            className="inline-flex h-11 items-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-800"
          >
            Go to reading log
          </Link>
        )}
      </header>

      <form
        onSubmit={handleSearch}
        className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row"
      >
        <div className="flex-1">
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by title"
            label="Title"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            className="h-11 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            disabled={searching}
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="h-11 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-800"
          >
            Clear
          </button>
        </div>
      </form>

      {error && <Toast message={error} type="error" onDismiss={() => setError(null)} />}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-40 animate-pulse rounded-lg bg-slate-200" />
          ))}
        </div>
      ) : pageItems.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {pageItems.map((book) => {
            const cardKey = `${book.source}-${book.id}`;
            return (
              <BookCard
                key={cardKey}
                id={book.id}
                title={book.title ?? 'Untitled'}
                authors={book.authors}
                thumbnailUrl={book.thumbnailUrl ?? null}
                description={book.description}
                badgeText={
                  book.source === 'local' && book.status ? book.status : undefined
                }
                badgeTone="blue"
              />
            );
          })}
        </div>
      ) : isAdmin ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
          <h2 className="text-lg font-semibold text-slate-800">No books yet</h2>
          <p className="mt-2 text-sm text-slate-500">
            Add your first title to start tracking reading progress and reviews.
          </p>
          <Link
            href="/books/new"
            className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Create a book
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
          <h2 className="text-lg font-semibold text-slate-800">No books available</h2>
          <p className="mt-2 text-sm text-slate-500">
            Try another search or come back later when new titles are available.
          </p>
          <button
            type="button"
            onClick={handleClear}
            className="mt-4 inline-flex h-10 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-800"
          >
            Refresh list
          </button>
        </div>
      )}

      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
        <span>
          Page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-md border border-slate-300 px-3 py-1 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page === 1}
          >
            Previous
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-300 px-3 py-1 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={page === totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
};

export default BooksPage;
