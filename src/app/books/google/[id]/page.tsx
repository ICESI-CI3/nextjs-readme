'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { notFound, useParams, useRouter } from 'next/navigation';
import Toast from '@/components/Toast';
import { useAuthStore } from '@/stores/authStore';
import { createReadingState } from '@/services/readingStateService';
import { getGoogleBookById, importFromGoogle } from '@/services/bookService';
import { addLocalReadingState } from '@/services/localReadingStateService';
import Select from '@/components/Form/Select';
import Textarea from '@/components/Form/Textarea';

type GoogleVolume = {
  id?: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    description?: string;
    publisher?: string;
    publishedDate?: string;
    pageCount?: number;
    categories?: string[];
    imageLinks?: { small?: string; thumbnail?: string; medium?: string; large?: string };
    previewLink?: string;
    infoLink?: string;
    industryIdentifiers?: Array<{ type?: string; identifier?: string }>;
  };
};

const statusOptions = [
  { value: 'to-read', label: 'To read' },
  { value: 'reading', label: 'Reading' },
  { value: 'completed', label: 'Completed' },
];

const extractIsbn = (volume: GoogleVolume) => {
  const identifiers = volume.volumeInfo?.industryIdentifiers ?? [];
  const prioritized = identifiers
    .filter((item): item is { type?: string; identifier?: string } => Boolean(item?.identifier))
    .sort((a, b) => {
      const weight = (type?: string) => {
        if (!type) return 99;
        const normalized = type.toLowerCase();
        if (normalized.includes('isbn13')) return 1;
        if (normalized.includes('isbn10')) return 2;
        return 3;
      };
      return weight(a.type) - weight(b.type);
    });
  return prioritized[0]?.identifier ?? null;
};

const extractCover = (volume: GoogleVolume) => {
  const links = volume.volumeInfo?.imageLinks;
  return links?.large ?? links?.medium ?? links?.thumbnail ?? links?.small ?? null;
};

const GoogleBookDetailPage = () => {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const user = useAuthStore((state) => state.user);

  const [volume, setVolume] = useState<GoogleVolume | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('reading');
  const [notes, setNotes] = useState<string>('');

  const volumeId = params?.id ? decodeURIComponent(params.id) : null;

  useEffect(() => {
    if (!volumeId) {
      notFound();
      return;
    }

    let active = true;

    const loadVolume = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getGoogleBookById(volumeId);
        if (!active) return;
        if (!data) {
          notFound();
          return;
        }
        setVolume(data);
      } catch (err) {
        console.error('Unable to load Google Books title', err);
        if (!active) return;
        setError('Unable to load this title from Google Books. It may be unavailable.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadVolume();

    return () => {
      active = false;
    };
  }, [volumeId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!volumeId || !volume) return;
    if (!user) {
      router.push(`/login?redirectTo=${encodeURIComponent(`/books/google/${volumeId}`)}`);
      return;
    }

    setError(null);
    setInfo(null);
    setRegistering(true);
    try {
      const details = volume.volumeInfo ?? {};
      const authorsList = Array.isArray(details.authors) ? details.authors : [];
      const authorsString = authorsList.join(', ');
      const payload = {
        googleId: volumeId,
        title: details.title ?? 'Untitled',
        authors: authorsString,
        authorList: authorsList,
        isbn: extractIsbn(volume),
        cover: extractCover(volume),
        description: details.description ?? '',
        publisher: details.publisher ?? '',
        publishedDate: details.publishedDate ?? '',
        pageCount: details.pageCount ?? null,
      };

      let syncedWithCatalog = false;
      let bookId: string | number | null = null;

      const imported = await importFromGoogle(payload);
      if (imported) {
        const created: any = (imported as any).book ?? imported;
        bookId = created?.id ?? created?._id ?? created?.bookId ?? null;
        syncedWithCatalog = Boolean(bookId);
      }

      const trimmedNotes = notes.trim();

      if (!bookId) {
        addLocalReadingState(String(user.id), {
          status,
          notes: trimmedNotes || undefined,
          googleId: volumeId,
          bookId: volumeId,
          title: details.title ?? 'Untitled',
          authors: authorsString,
          cover: extractCover(volume),
          description: details.description ?? '',
        });
        setInfo(
          'Reading entry saved locally. You can update or remove it from the reading log, and ask an administrator to import it later.',
        );
        setNotes('');
        setStatus('reading');
        return;
      }

      await createReadingState({
        bookId,
        status,
        notes: trimmedNotes ? trimmedNotes : undefined,
      });

      setInfo(
        syncedWithCatalog
          ? 'Reading entry created. You can update your progress from the reading log.'
          : 'Reading entry created. Ask an administrator to sync it with the catalog if details are missing.',
      );
      setNotes('');
      setStatus('reading');
    } catch (err) {
      console.error('Unable to start reading', err);
      setError(err instanceof Error ? err.message : 'Unable to start reading this book.');
    } finally {
      setRegistering(false);
    }
  };

  if (!volumeId) {
    return null;
  }

  const details = volume?.volumeInfo ?? {};
  const cover = extractCover(volume ?? {});
  const authors = Array.isArray(details.authors) ? details.authors.join(', ') : 'Unknown author';
  const categories = Array.isArray(details.categories) ? details.categories.join(', ') : 'Uncategorized';
  const publishedDate = details.publishedDate
    ? new Date(details.publishedDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : 'Unknown';
  const isbn = extractIsbn(volume ?? {});

  return (
    <section className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{details.title ?? 'Untitled book'}</h1>
          <p className="text-sm text-slate-500">Sourced directly from Google Books.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {details.previewLink ? (
            <a
              href={details.previewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-800"
            >
              Preview on Google Books
            </a>
          ) : null}
        </div>
      </header>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-800">Log this book</h2>
          <p className="text-sm text-slate-500">
            Choose the status you want to assign and add optional notes for your reading log.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-[180px,1fr]">
          <Select
            label="Status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            options={statusOptions}
            disabled={loading || registering}
            required
          />
          <Textarea
            label="Notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="What are you planning to track for this book?"
            rows={3}
            disabled={registering}
          />
        </div>
        <div className="flex justify-end gap-3">
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            disabled={registering || loading}
          >
            {registering ? 'Saving...' : 'Save to reading log'}
          </button>
        </div>
      </form>

      {error ? <Toast message={error} type="error" onDismiss={() => setError(null)} /> : null}
      {info ? <Toast message={info} type="success" onDismiss={() => setInfo(null)} /> : null}

      {loading ? (
        <div className="space-y-4">
          <div className="h-48 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-24 animate-pulse rounded-lg bg-slate-200" />
        </div>
      ) : volume ? (
        <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
          <aside className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            {cover ? (
              <div className="relative h-64 w-full overflow-hidden rounded-md border border-slate-100">
                <img src={cover} alt={details.title ?? 'Book cover'} className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="flex h-64 w-full items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-100 text-sm text-slate-400">
                No cover available
              </div>
            )}
            <dl className="space-y-2 text-sm text-slate-600">
              <div className="flex justify-between">
                <dt className="font-medium text-slate-500">Author(s)</dt>
                <dd className="text-right text-slate-700">{authors}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium text-slate-500">Categories</dt>
                <dd className="text-right text-slate-700">{categories}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium text-slate-500">Published</dt>
                <dd className="text-right text-slate-700">{publishedDate}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium text-slate-500">ISBN</dt>
                <dd className="text-right text-slate-700">{isbn ?? 'N/A'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium text-slate-500">Pages</dt>
                <dd className="text-right text-slate-700">{details.pageCount ?? 'Unknown'}</dd>
              </div>
            </dl>
          </aside>

          <article className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800">Description</h2>
            <p className="text-sm text-slate-600">{details.description ?? 'No description provided yet.'}</p>
            <div className="flex flex-wrap gap-3 text-sm text-slate-500">
              <span>Publisher: {details.publisher ?? 'Unknown'}</span>
              <span>Google ID: {volume.id}</span>
            </div>
          </article>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          Book not found.
        </div>
      )}

      <div className="flex justify-end">
        <Link
          href="/reading"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-800"
        >
          Go to reading log
        </Link>
      </div>
    </section>
  );
};

export default GoogleBookDetailPage;
