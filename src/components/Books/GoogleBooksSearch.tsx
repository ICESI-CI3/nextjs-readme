'use client';

import { FormEvent, useState } from 'react';
import Input from '@/components/Form/Input';
import Select from '@/components/Form/Select';
import Toast from '@/components/Toast';
import { searchGoogleBooks } from '@/services/bookService';
import { GOOGLE_BOOKS_MAX_RESULTS } from '@/lib/googleBooksConfig';

type GoogleBookResult = {
  title?: string;
  authors?: string[] | string;
  isbn?: string;
  cover?: string;
  description?: string;
  publisher?: string;
  publishedDate?: string;
};

type GoogleBooksSearchProps = {
  onSelect: (book: GoogleBookResult) => void;
};

const GoogleBooksSearch = ({ onSelect }: GoogleBooksSearchProps) => {
  const [query, setQuery] = useState('');
  const [searchBy, setSearchBy] = useState<'title' | 'isbn'>('title');
  const [results, setResults] = useState<GoogleBookResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();
    if (!query.trim()) {
      setError('Enter a title or ISBN before searching.');
      return;
    }

    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      const response = await searchGoogleBooks({
        query,
        searchBy,
        maxResults: GOOGLE_BOOKS_MAX_RESULTS,
      });

      const list: GoogleBookResult[] = Array.isArray(response)
        ? response
        : Array.isArray(response?.items)
          ? response.items
          : [];

      setResults(list);
      if (!list.length) {
        setInfo('No matches found. Try different keywords.');
      }
    } catch (err) {
      setError('Unable to contact Google Books right now.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (book: GoogleBookResult) => {
    const authors =
      Array.isArray(book.authors) ? book.authors.join(', ') : book.authors ?? '';
    onSelect({
      ...book,
      authors,
    });
    setInfo('Book details filled from Google Books.');
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
      <h3 className="mb-3 text-base font-semibold text-slate-700">Search Google Books</h3>
      <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchBy === 'title' ? 'e.g., The Fellowship of the Ring' : 'ISBN e.g., 9780544003415'}
            label="Keyword"
            required
          />
        </div>
        <div className="w-full sm:w-40">
          <Select
            label="Search by"
            value={searchBy}
            onChange={(event) => setSearchBy(event.target.value as 'title' | 'isbn')}
            options={[
              { value: 'title', label: 'Title' },
              { value: 'isbn', label: 'ISBN' },
            ]}
          />
        </div>
        <button
          type="submit"
          className="h-11 rounded-md bg-blue-600 px-4 font-semibold text-white transition hover:bg-blue-700 disabled:bg-blue-300"
          disabled={loading}
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      <div className="mt-4 space-y-3">
        {error ? <Toast message={error} type="error" onDismiss={() => setError(null)} /> : null}
        {info ? <Toast message={info} type="info" onDismiss={() => setInfo(null)} /> : null}
      </div>

      {loading ? <p className="mt-4 text-sm text-slate-500">Loading results...</p> : null}

      {!loading && results.length ? (
        <ul className="mt-4 space-y-3">
          {results.map((book, index) => {
            const authors =
              Array.isArray(book.authors) ? book.authors.join(', ') : book.authors ?? 'Unknown author';
            return (
              <li
                key={`${book.isbn ?? book.title ?? index}`}
                className="flex flex-col gap-2 rounded-md border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-slate-800">{book.title ?? 'Untitled'}</p>
                  <p className="text-xs text-slate-500">
                    {authors}
                    {book.publishedDate ? ` - ${book.publishedDate}` : ''}
                  </p>
                  {book.description ? (
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">{book.description}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => handleSelect(book)}
                  className="self-start rounded-md border border-blue-200 px-3 py-1 text-sm font-medium text-blue-600 transition hover:border-blue-300 hover:text-blue-700"
                >
                  Use this book
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
};

export default GoogleBooksSearch;
