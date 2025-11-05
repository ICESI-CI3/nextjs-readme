'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { notFound, useParams, useRouter } from 'next/navigation';
import Input from '@/components/Form/Input';
import Select from '@/components/Form/Select';
import Textarea from '@/components/Form/Textarea';
import Toast from '@/components/Toast';
import {
  deleteBook,
  getBookById,
  getGoogleBookById,
  updateBook,
} from '@/services/bookService';
import type { BookRecord } from '@/services/bookService';
import {
  createReadingState,
  getReadingStatesByUser,
  updateReadingState,
  upsertReadingState,
} from '@/services/readingStateService';
import type { GoogleVolume } from '@/lib/googleBooks';
import {
  createReview,
  getReviewsByBook,
  type ReviewRecord,
} from '@/services/reviewService';
import { useAuthStore } from '@/stores/authStore';

type LocalBook = {
  id?: string | number;
  title?: string;
  authors?: string;
  isbn?: string;
  cover?: string;
  status?: 'pending' | 'reading' | 'read' | string;
  description?: string;
  publishedDate?: string;
};

const mapBookRecordToLocalBook = (record: BookRecord): LocalBook => {
  const publishedDate = record['publishedDate'];
  return {
    id: record.id,
    title: typeof record.title === 'string' ? record.title : undefined,
    authors: coerceAuthors(record.authors),
    isbn: typeof record.isbn === 'string' ? record.isbn : undefined,
    cover: typeof record.cover === 'string' ? record.cover : undefined,
    status: typeof record.status === 'string' ? record.status : undefined,
    description:
      typeof record.description === 'string' ? record.description : undefined,
    publishedDate:
      typeof publishedDate === 'string' ? publishedDate : undefined,
  };
};

type UiStatus = 'to-read' | 'reading' | 'completed';

const catalogStatusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'reading', label: 'Reading' },
  { value: 'read', label: 'Read' },
];

const readingStatusOptions: Array<{ value: UiStatus; label: string }> = [
  { value: 'to-read', label: 'To read' },
  { value: 'reading', label: 'Reading' },
  { value: 'completed', label: 'Completed' },
];

const toUiStatus = (status: unknown): UiStatus => {
  if (typeof status !== 'string') return 'reading';
  const normalized = status.trim().toLowerCase();
  if (normalized === 'pending' || normalized === 'to-read' || normalized === 'to read') {
    return 'to-read';
  }
  if (
    normalized === 'read' ||
    normalized === 'completed' ||
    normalized === 'complete'
  ) {
    return 'completed';
  }
  if (normalized === 'reading') {
    return 'reading';
  }
  return 'reading';
};

const extractPrimaryIsbn = (volume: GoogleVolume | null): string | undefined => {
  if (!volume?.volumeInfo?.industryIdentifiers) return undefined;
  const identifiers = volume.volumeInfo.industryIdentifiers;
  const isbn13 = identifiers.find((item) =>
    item?.type?.toLowerCase().includes('isbn13'),
  )?.identifier;
  if (isbn13) return isbn13;
  return identifiers.find((item) =>
    item?.type?.toLowerCase().includes('isbn10'),
  )?.identifier;
};

const coerceAuthors = (value: unknown): string | undefined => {
  if (Array.isArray(value)) {
    const names = value
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        if (typeof item === 'number') return String(item);
        return '';
      })
      .filter((entry): entry is string => entry.length > 0);
    if (names.length) {
      return names.join(', ');
    }
    return undefined;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const entries = trimmed
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
    if (entries.length) {
      return entries.join(', ');
    }
    return trimmed;
  }
  return undefined;
};

const formatAuthors = (value: unknown): string => {
  const normalized = coerceAuthors(value);
  return normalized ?? 'Unknown author';
};

const formatDate = (value?: string | null): string => {
  if (!value) return 'N/A';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
};

const BookDetailPage = () => {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.user?.role ?? 'reader');
  const isAdmin = (role ?? 'reader').toString().toLowerCase() === 'admin';

  const [source, setSource] = useState<'local' | 'google' | null>(null);
  const [book, setBook] = useState<LocalBook | null>(null);
  const [googleVolume, setGoogleVolume] = useState<GoogleVolume | null>(null);

  const [form, setForm] = useState<LocalBook>({
    title: '',
    authors: '',
    isbn: '',
    cover: '',
    status: 'pending',
    description: '',
    publishedDate: '',
  });
  const [bookIdentifier, setBookIdentifier] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [readingStatus, setReadingStatus] = useState<UiStatus>('reading');
  const [readingStateId, setReadingStateId] = useState<string | null>(null);
  const [readingLoading, setReadingLoading] = useState(false);
  const [readingBusy, setReadingBusy] = useState(false);
  const [readingError, setReadingError] = useState<string | null>(null);
  const [readingSuccess, setReadingSuccess] = useState<string | null>(null);

  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [reviewForm, setReviewForm] = useState<{ rating: string; text: string }>({
    rating: '5',
    text: '',
  });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);

  const rawId = params?.id ?? '';
  const decodedId = rawId ? decodeURIComponent(rawId) : null;
  const detailPath = decodedId ? `/books/${encodeURIComponent(decodedId)}` : '/books';
  const loginRedirect = `/login?redirectTo=${encodeURIComponent(detailPath)}`;

  useEffect(() => {
    if (!decodedId) {
      notFound();
      return;
    }

    let ignore = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      setSuccess(null);
      setSource(null);
      setBook(null);
      setGoogleVolume(null);

      try {
        const localBook = await getBookById(decodedId);
        if (!ignore && localBook) {
          setSource('local');
          const normalizedBook = mapBookRecordToLocalBook(localBook);
          setBook(normalizedBook);
          setBookIdentifier(
            typeof normalizedBook.title === 'string' && normalizedBook.title.trim()
              ? normalizedBook.title
              : null,
          );
          setForm({
            title: normalizedBook.title ?? '',
            authors: normalizedBook.authors ?? '',
            isbn: normalizedBook.isbn ?? '',
            cover: normalizedBook.cover ?? '',
            status:
              (normalizedBook.status as LocalBook['status']) ?? 'pending',
            description: normalizedBook.description ?? '',
            publishedDate: normalizedBook.publishedDate ?? '',
          });
          return;
        }
      } catch (err) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('Unable to load catalog book', err);
        }
      }

      try {
        const volume = await getGoogleBookById(decodedId);
        if (!ignore && volume) {
          setSource('google');
          setGoogleVolume(volume);
          setBookIdentifier(volume.volumeInfo?.title ?? null);
          return;
        }
      } catch (err) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('Unable to load Google Books volume', err);
        }
      }

      if (!ignore) {
        setError('Unable to load this book. It may have been removed.');
      }
    };

    load().finally(() => {
      if (!ignore) setLoading(false);
    });

    return () => {
      ignore = true;
    };
  }, [decodedId]);

  useEffect(() => {
    if (!isAdmin || source !== 'local') {
      setEditing(false);
    }
  }, [isAdmin, source]);

  useEffect(() => {
    if (!user?.id || !decodedId || !source) {
      setReadingStateId(null);
      setReadingStatus('reading');
      return;
    }

    let ignore = false;

    const loadStatus = async () => {
      setReadingLoading(true);
      setReadingError(null);
      try {
        const data = await getReadingStatesByUser(String(user.id));
        if (ignore || !data) return;
        const list = Array.isArray(data) ? data : [data];
        const match = list.find((entry) => {
          if (!entry) return false;
          if (source === 'local') {
            const candidate =
              (entry.bookId ?? (entry as { book?: { id?: unknown } }).book?.id) ?? null;
            return candidate !== null && String(candidate) === decodedId;
          }
          const googleId = (entry as { googleId?: unknown }).googleId;
          return googleId !== undefined && String(googleId) === decodedId;
        });
        if (match) {
          setReadingStateId(match.id ? String(match.id) : null);
          setReadingStatus(toUiStatus((match.status ?? match.state) as string));
        } else {
          setReadingStateId(null);
          setReadingStatus('reading');
        }
      } catch (err) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('Unable to load reading status', err);
        }
        if (!ignore) {
          setReadingError('Unable to load your reading status.');
        }
      } finally {
        if (!ignore) setReadingLoading(false);
      }
    };

    loadStatus();
    return () => {
      ignore = true;
    };
  }, [user?.id, decodedId, source]);

  useEffect(() => {
    if (source !== 'local' || !book?.id) {
      setReviews([]);
      return;
    }

    let ignore = false;

    const loadReviews = async () => {
      setReviewsLoading(true);
      setReviewsError(null);
      try {
        const data = await getReviewsByBook(book.id as string | number);
        if (!ignore) {
          const list = Array.isArray(data) ? data : data ? [data] : [];
          setReviews(list);
        }
      } catch (err) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('Unable to load reviews', err);
        }
        if (!ignore) {
          setReviewsError('Unable to load reviews right now.');
        }
      } finally {
        if (!ignore) setReviewsLoading(false);
      }
    };

    loadReviews();
    return () => {
      ignore = true;
    };
  }, [source, book?.id]);

  const identifier =
    bookIdentifier ??
    (typeof book?.title === 'string' && book.title.trim() ? book.title : '') ??
    '';

  const handleUpdateField = <Key extends keyof LocalBook>(key: Key, value: LocalBook[Key]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };
  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isAdmin || source !== 'local') return;
    if (!identifier) {
      setError('This book cannot be modified because it is missing a title.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await updateBook(identifier, form);
      setSuccess('Book updated successfully.');
      setEditing(false);
      setBook((prev) => {
        if (!updated) return prev ? { ...prev, ...form } : prev;
        const normalized = mapBookRecordToLocalBook(updated);
        return { ...(prev ?? {}), ...normalized };
      });
      const nextIdentifier =
        (updated && typeof updated.title === 'string' && updated.title.trim()
          ? updated.title
          : null) ??
        (typeof form.title === 'string' && form.title.trim() ? form.title : null) ??
        identifier;
      setBookIdentifier(nextIdentifier);
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Update failed', err);
      }
      setError('Update failed. Please check the fields and try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isAdmin || source !== 'local') return;
    if (!identifier) {
      setError('Unable to update this book because its original title is missing.');
      return;
    }

    setError(null);
    setRemoving(true);
    try {
      await deleteBook(identifier);
      router.push('/books');
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Delete failed', err);
      }
      setError('Unable to delete this book right now.');
    } finally {
      setRemoving(false);
    }
  };

  const persistReadingStatus = async (nextStatus: UiStatus) => {
    if (!decodedId || !source) return;
    if (!user?.id) {
      router.push(loginRedirect);
      return;
    }

    setReadingError(null);
    setReadingSuccess(null);
    setReadingBusy(true);
    try {
      if (source === 'google') {
        const result = await upsertReadingState({
          userId: String(user.id),
          googleId: decodedId,
          uiStatus: nextStatus,
        });
        if (result?.id) {
          setReadingStateId(String(result.id));
        }
      } else if (source === 'local') {
        if (!book?.id) return;
        if (readingStateId) {
          await updateReadingState(readingStateId, { status: nextStatus });
        } else {
          const created = await createReadingState({
            userId: user.id,
            bookId: book.id,
            status: nextStatus,
          });
          if (created?.id) {
            setReadingStateId(String(created.id));
          }
        }
      }
      setReadingSuccess('Reading status updated.');
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Unable to update reading status', err);
      }
      setReadingError('Unable to update your reading status right now.');
    } finally {
      setReadingBusy(false);
    }
  };

  const handleReadingStatusChange = async (event: ChangeEvent<HTMLSelectElement>) => {
    const nextValue = event.target.value as UiStatus;
    setReadingStatus(nextValue);
    await persistReadingStatus(nextValue);
  };

  const handleSubmitReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (source !== 'local' || !book?.id) return;
    if (!user?.id) {
      router.push(loginRedirect);
      return;
    }

    const trimmed = reviewForm.text.trim();
    if (!trimmed) {
      setReviewsError('Write a short review before submitting.');
      return;
    }

    const ratingValue = Number(reviewForm.rating);
    if (Number.isNaN(ratingValue) || ratingValue < 1 || ratingValue > 5) {
      setReviewsError('Rating must be between 1 and 5.');
      return;
    }

    setReviewsError(null);
    setReviewSuccess(null);
    setReviewSubmitting(true);
    try {
      await createReview({
        bookId: book.id,
        rating: ratingValue,
        text: trimmed,
        comment: trimmed,
        userId: user.id,
      });
      setReviewForm({ rating: '5', text: '' });
      setReviewSuccess('Review submitted successfully.');
      const data = await getReviewsByBook(book.id);
      const list = Array.isArray(data) ? data : data ? [data] : [];
      setReviews(list);
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Unable to save review', err);
      }
      setReviewsError('Unable to save your review right now.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const catalogBadge =
    source === 'local' && (book?.status ?? '').toString().trim().length ? (
      <span className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold uppercase text-slate-600">
        Catalog: {(book?.status ?? '').toString()}
      </span>
    ) : null;

  const googleBadge =
    source === 'google' ? (
      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase text-emerald-700">
        Google Books
      </span>
    ) : null;

  const sortedReviews = useMemo(() => {
    if (!reviews.length) return [];
    return [...reviews].sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [reviews]);

  const displayTitle =
    (source === 'local' && book?.title) ||
    (source === 'google' && googleVolume?.volumeInfo?.title) ||
    'Book details';

  const displayAuthors =
    source === 'local'
      ? formatAuthors(book?.authors)
      : formatAuthors(googleVolume?.volumeInfo?.authors ?? []);

  const displayIsbn =
    source === 'local' ? book?.isbn : extractPrimaryIsbn(googleVolume) ?? undefined;

  const coverUrl =
    source === 'local'
      ? book?.cover ?? null
      : googleVolume?.volumeInfo?.imageLinks?.thumbnail ??
        googleVolume?.volumeInfo?.imageLinks?.smallThumbnail ??
        null;

  const description =
    (source === 'local' && book?.description) ||
    (source === 'google' && googleVolume?.volumeInfo?.description) ||
    null;

  const publishedDate =
    (source === 'local' && book?.publishedDate) ||
    (source === 'google' && googleVolume?.volumeInfo?.publishedDate) ||
    null;
  if (!decodedId) {
    return null;
  }

  return (
    <section className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold text-slate-900">{displayTitle}</h1>
              {catalogBadge}
              {googleBadge}
            </div>
            <p className="text-sm text-slate-500">
              {source === 'google'
                ? 'Details fetched from Google Books. Track the title directly from here.'
                : 'View book metadata, availability, and community feedback.'}
            </p>
            {source === 'local' && !isAdmin ? (
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Only administrators can edit or remove books.
              </p>
            ) : null}
          </div>

          {source ? (
            <div className="flex flex-col items-end gap-2">
              <span className="text-xs font-semibold uppercase text-slate-500">
                Reading status
              </span>
              {user ? (
                <div className="flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1">
                  <select
                    aria-label="Reading status"
                    value={readingStatus}
                    onChange={handleReadingStatusChange}
                    disabled={readingBusy || readingLoading}
                    className="bg-transparent text-sm font-semibold text-blue-700 outline-none"
                  >
                    {readingStatusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <span className="text-[11px] font-medium text-blue-600">
                    {readingBusy ? 'Saving...' : readingSuccess ? 'Saved' : ''}
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => router.push(loginRedirect)}
                  className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-800"
                >
                  Log in to track
                </button>
              )}
            </div>
          ) : null}
        </div>

        {source === 'local' && isAdmin ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditing((prev) => !prev)}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-800"
              disabled={loading}
            >
              {editing ? 'Cancel editing' : 'Edit details'}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-md border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:border-rose-300 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={loading || removing || !identifier}
            >
              {removing ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        ) : null}
      </header>

      {error ? <Toast message={error} type="error" onDismiss={() => setError(null)} /> : null}
      {success ? (
        <Toast message={success} type="success" onDismiss={() => setSuccess(null)} />
      ) : null}
      {readingError ? (
        <Toast message={readingError} type="error" onDismiss={() => setReadingError(null)} />
      ) : null}
      {readingSuccess ? (
        <Toast message={readingSuccess} type="success" onDismiss={() => setReadingSuccess(null)} />
      ) : null}
      {reviewSuccess ? (
        <Toast message={reviewSuccess} type="success" onDismiss={() => setReviewSuccess(null)} />
      ) : null}
      {reviewsError ? (
        <Toast message={reviewsError} type="error" onDismiss={() => setReviewsError(null)} />
      ) : null}

      {loading ? (
        <div className="space-y-4">
          <div className="h-48 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-24 animate-pulse rounded-lg bg-slate-200" />
        </div>
      ) : source === 'local' && book ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr),minmax(320px,1fr)]">
          <div className="space-y-6">
            <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-[200px,1fr]">
              <div className="relative h-64 w-full overflow-hidden rounded-md border border-slate-100 md:h-full">
                {coverUrl ? (
                  <Image
                    src={coverUrl}
                    alt={`${book.title ?? 'Book'} cover`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 200px"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-100 px-4 text-center text-sm text-slate-400">
                    No cover available
                  </div>
                )}
              </div>
              <dl className="grid gap-3 text-sm text-slate-600">
                <div className="flex justify-between gap-4">
                  <dt className="font-medium text-slate-500">Title</dt>
                  <dd className="text-right text-slate-700">{book.title ?? 'N/A'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="font-medium text-slate-500">Authors</dt>
                  <dd className="text-right text-slate-700">{formatAuthors(book.authors)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="font-medium text-slate-500">ISBN</dt>
                  <dd className="text-right text-slate-700">{book.isbn ?? 'N/A'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="font-medium text-slate-500">Published</dt>
                  <dd className="text-right text-slate-700">{formatDate(publishedDate)}</dd>
                </div>
              </dl>
            </div>

            {isAdmin && editing ? (
              <form
                onSubmit={handleSave}
                className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="Title"
                    value={form.title}
                    onChange={(event) => handleUpdateField('title', event.target.value)}
                    required
                  />
                  <Input
                    label="Authors"
                    value={form.authors}
                    onChange={(event) => handleUpdateField('authors', event.target.value)}
                    required
                  />
                  <Input
                    label="ISBN"
                    value={form.isbn}
                    onChange={(event) => handleUpdateField('isbn', event.target.value)}
                    required
                  />
                  <Input
                    label="Cover URL"
                    value={form.cover ?? ''}
                    onChange={(event) => handleUpdateField('cover', event.target.value)}
                  />
                  <Select
                    label="Catalog status"
                    value={form.status ?? 'pending'}
                    onChange={(event) =>
                      handleUpdateField('status', event.target.value as LocalBook['status'])
                    }
                    options={catalogStatusOptions}
                  />
                  <Input
                    label="Published"
                    value={form.publishedDate ?? ''}
                    onChange={(event) => handleUpdateField('publishedDate', event.target.value)}
                  />
                </div>
                <Textarea
                  label="Description"
                  value={form.description ?? ''}
                  onChange={(event) => handleUpdateField('description', event.target.value)}
                />
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save changes'}
                  </button>
                </div>
              </form>
            ) : (
              <article className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-800">Description</h2>
                <p className="text-sm text-slate-600">
                  {description ?? 'No description provided yet.'}
                </p>
              </article>
            )}
          </div>

          <div className="space-y-6">
            <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <header>
                <h2 className="text-lg font-semibold text-slate-800">Review history</h2>
                <p className="text-sm text-slate-500">
                  Read what others think about this title.
                </p>
              </header>
              {reviewsLoading ? (
                <div className="grid gap-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-20 animate-pulse rounded-md border border-slate-200 bg-slate-100"
                    />
                  ))}
                </div>
              ) : sortedReviews.length ? (
                <ul className="space-y-3">
                  {sortedReviews.map((review) => (
                    <li
                      key={(review.id ?? crypto.randomUUID()).toString()}
                      className="rounded-md border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-800">
                          Rating: {Number(review.rating ?? review.status ?? 0) || 0}/5
                        </span>
                        <span className="text-xs text-slate-400">
                          {review.createdAt ? formatDate(review.createdAt) : 'Recently'}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">
                        {(review.text ?? review.comment ?? '').toString() || 'No review text.'}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-md border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                  No reviews yet. Be the first to share your thoughts.
                </div>
              )}
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              {user ? (
                <form onSubmit={handleSubmitReview} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-[160px,1fr]">
                    <Select
                      label="Your rating"
                      value={reviewForm.rating}
                      onChange={(event) =>
                        setReviewForm((prev) => ({ ...prev, rating: event.target.value }))
                      }
                      options={[
                        { value: '5', label: '5 - Excellent' },
                        { value: '4', label: '4 - Good' },
                        { value: '3', label: '3 - Average' },
                        { value: '2', label: '2 - Fair' },
                        { value: '1', label: '1 - Poor' },
                      ]}
                      required
                    />
                    <Textarea
                      label="Your review"
                      value={reviewForm.text}
                      onChange={(event) =>
                        setReviewForm((prev) => ({ ...prev, text: event.target.value }))
                      }
                      placeholder="What stood out to you?"
                      required
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                      disabled={reviewSubmitting}
                    >
                      {reviewSubmitting ? 'Saving...' : 'Submit review'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  <p>
                    <button
                      type="button"
                      onClick={() => router.push(loginRedirect)}
                      className="font-semibold text-blue-600 hover:text-blue-700"
                    >
                      Log in
                    </button>{' '}
                    to write a review for this book.
                  </p>
                </div>
              )}
            </section>
          </div>
        </div>
      ) : source === 'google' && googleVolume ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr),minmax(320px,1fr)]">
          <div className="space-y-6">
            <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-[200px,1fr]">
              <div className="relative h-64 w-full overflow-hidden rounded-md border border-slate-100 md:h-full">
                {coverUrl ? (
                  <Image
                    src={coverUrl}
                    alt={`${displayTitle} cover`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 200px"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-100 px-4 text-center text-sm text-slate-400">
                    No cover available
                  </div>
                )}
              </div>
              <dl className="grid gap-3 text-sm text-slate-600">
                <div className="flex justify-between gap-4">
                  <dt className="font-medium text-slate-500">Title</dt>
                  <dd className="text-right text-slate-700">{displayTitle}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="font-medium text-slate-500">Authors</dt>
                  <dd className="text-right text-slate-700">{displayAuthors}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="font-medium text-slate-500">ISBN</dt>
                  <dd className="text-right text-slate-700">{displayIsbn ?? 'N/A'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="font-medium text-slate-500">Published</dt>
                  <dd className="text-right text-slate-700">{formatDate(publishedDate)}</dd>
                </div>
                {googleVolume.volumeInfo?.printType ? (
                  <div className="flex justify-between gap-4">
                    <dt className="font-medium text-slate-500">Format</dt>
                    <dd className="text-right text-slate-700">
                      {googleVolume.volumeInfo.printType}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </div>

            <article className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-800">Description</h2>
              <p className="text-sm text-slate-600">
                {description ?? 'No description provided for this Google Books entry.'}
              </p>
            </article>
          </div>

          <div className="space-y-6">
            <section className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-800">Community reviews</h2>
              <p className="mt-2">
                Reviews are available for titles saved in the library catalog. Save this
                book to your reading log and, once it is added locally, start the discussion
                here.
              </p>
            </section>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          Book not found.
        </div>
      )}
    </section>
  );
};

export default BookDetailPage;
