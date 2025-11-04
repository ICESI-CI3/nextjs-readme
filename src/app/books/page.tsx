'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Input from '@/components/Form/Input';
import Toast from '@/components/Toast';
import { useAuthStore } from '@/stores/authStore';
import { getAllBooks, getBookByTitle, searchGoogleBooks } from '@/services/bookService';

type Book = {
  id?: string | number;
  title?: string;
  authors?: string;
  isbn?: string;
  cover?: string;
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

const mapBackendBook = (book: Record<string, unknown>): Book => ({
  ...(book as Book),
  source: 'local',
});

const mapGoogleVolume = (volume: GoogleVolume): Book => {
  const info = volume.volumeInfo ?? {};
  const authors = Array.isArray(info.authors) ? info.authors.join(', ') : undefined;
  const identifiers = Array.isArray(info.industryIdentifiers) ? info.industryIdentifiers : [];
  const primaryIsbn = identifiers.find((item) => item?.type?.toLowerCase().includes('isbn13'))?.identifier ??
    identifiers.find((item) => item?.type?.toLowerCase().includes('isbn10'))?.identifier;
  const cover = info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail ?? undefined;

  return {
    id: volume.id,
    title: info.title ?? 'Untitled',
    authors,
    isbn: primaryIsbn,
    cover,
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
        if (isAdmin) {
          const list = await getAllBooks();
          if (!active) return;
          const normalized = Array.isArray(list) ? list : list ? [list] : [];
          const mapped = normalized.map(mapBackendBook);
          setBooks(mapped);
          setFilteredBooks(mapped);
        } else {
          const response = await searchGoogleBooks({ query: DEFAULT_GOOGLE_QUERY, maxResults: 24 });
          if (!active) return;
          const items = Array.isArray(response?.items) ? response.items : [];
          const mapped = items.map(mapGoogleVolume);
          setBooks(mapped);
          setFilteredBooks(mapped);
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
  }, [isAdmin]);

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearching(true);
    setError(null);
    try {
      if (!searchTerm.trim()) {
        setFilteredBooks(books);
        setPage(1);
        return;
      }

      if (isAdmin) {
        const result = await getBookByTitle(searchTerm.trim());
        const normalized = Array.isArray(result) ? result : result ? [result] : [];
        const mapped = normalized.map(mapBackendBook);
        setBooks(mapped);
        setFilteredBooks(mapped);
        setPage(1);
        if (!mapped.length) {
          setError('No books found with that title.');
        }
      } else {
        const response = await searchGoogleBooks({
          query: searchTerm.trim(),
          searchBy: 'title',
          maxResults: 24,
        });
        const items = Array.isArray(response?.items) ? response.items : [];
        const mapped = items.map(mapGoogleVolume);
        setBooks(mapped);
        setFilteredBooks(mapped);
        setPage(1);
        if (!mapped.length) {
          setError('No books found for that search.');
        }
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
    if (isAdmin) {
      setFilteredBooks(books);
    } else {
      setLoading(true);
      searchGoogleBooks({ query: DEFAULT_GOOGLE_QUERY, maxResults: 24 })
        .then((response) => {
          const items = Array.isArray(response?.items) ? response.items : [];
          const mapped = items.map(mapGoogleVolume);
          setBooks(mapped);
          setFilteredBooks(mapped);
        })
        .catch((err) => {
          console.error('Unable to refresh Google books', err);
          setBooks([]);
          setFilteredBooks([]);
          setError('Unable to refresh the catalog. Try again later.');
        })
        .finally(() => setLoading(false));
    }
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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pageItems.map((book, index) => {
            const href = book.source === 'google'
              ? `/books/google/${book.id ?? index}`
              : `/books/${book.id ?? book.title ?? index}`;
            return (
              <Link
                key={(book.id ?? book.isbn ?? book.title ?? index).toString()}
                href={href}
                className="flex h-full flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">{book.title ?? 'Untitled'}</h2>
                    <p className="text-xs text-slate-500">{book.authors ?? 'Unknown author'}</p>
                  </div>
                  {book.source === 'local' && book.status ? (
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase text-blue-600">
                      {book.status}
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>ISBN: {book.isbn ?? 'N/A'}</span>
                  <span>{book.cover ? 'Cover available' : 'No cover'}</span>
                </div>
              </Link>
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
