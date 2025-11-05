'use client';

import { FormEvent, useEffect, useState } from 'react';
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

const formatAuthors = (value: unknown): string => {
  if (Array.isArray(value)) {
    const names = value
      .map((item) =>
        typeof item === 'string'
          ? item.trim()
          : typeof item === 'number'
            ? String(item)
            : '',
      )
      .filter(Boolean);
    if (names.length) {
      return names.join(', ');
    }
  }
  if (typeof value === 'string') {
    const normalized = value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
    if (normalized.length) {
      return normalized.join(', ');
    }
    if (value.trim()) {
      return value.trim();
    }
  }
  return 'Unknown author';
};

const BookDetailPage = () => {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.user?.role ?? 'reader');
  const normalizedRole = (role ?? 'reader').toString().toLowerCase();
  const isAdmin = normalizedRole === 'admin';

  const [book, setBook] = useState<LocalBook | null>(null);
  const [googleVolume, setGoogleVolume] = useState<GoogleVolume | null>(null);
  const [source, setSource] = useState<'local' | 'google' | null>(null);

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
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [editing, setEditing] = useState(false);

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

  const paramId = params?.id ?? '';
  const decodedId = paramId ? decodeURIComponent(paramId) : null;

  const detailPath = decodedId ? `/books/${encodeURIComponent(decodedId)}` : '/books';
  const loginRedirect = `/login?redirectTo=${encodeURIComponent(detailPath)}`;

  useEffect(() => {
    if (!decodedId) {
      notFound();
      return;
    }

    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      setSuccess(null);
      setSource(null);
      setGoogleVolume(null);
      setBook(null);

      let resolved = false;

      try {
        const data = await getBookById(decodedId);
        if (!active) return;
        if (data) {
          resolved = true;
          setSource('local');
          setBook(data);
          setGoogleVolume(null);
          setBookIdentifier(
            typeof data.title === 'string' && data.title.trim() ? data.title : null,
          );
          setForm({
            title: data.title ?? '',
            authors: data.authors ?? '',
            isbn: data.isbn ?? '',
            cover: data.cover ?? '',
            status: (data.status as LocalBook['status']) ?? 'pending',
            description: data.description ?? '',
            publishedDate: data.publishedDate ?? '',
          });
        }
      } catch (err) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('Unable to load catalog book', err);
        }
      }

      if (!resolved) {
        try {
          const volume = await getGoogleBookById(decodedId);
          if (!active) return;
          if (volume) {
            resolved = true;
            setSource('google');
            setGoogleVolume(volume);
            setBookIdentifier(volume.volumeInfo?.title ?? null);
          }
        } catch (err) {
          if (process.env.NODE_ENV !== 'production') {
            console.error('Unable to load Google Books volume', err);
          }
        }
      }

      if (!resolved && active) {
        setError('Unable to load this book. It may have been removed.');
      }

      if (active) {
        setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
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

    let active = true;

    const loadStatus = async () => {
      setReadingLoading(true);
      setReadingError(null);
      try {
        const data = await getReadingStatesByUser(String(user.id));
        if (!active || !data) {
          return;
        }
        const list = Array.isArray(data) ? data : [data];
        const match = list.find((state) => {
          if (!state) return false;
          if (source === 'local') {
            const candidate =
              (state.bookId ?? (state as { book?: { id?: unknown } }).book?.id) ??
              null;
            return candidate !== null && String(candidate) === decodedId;
          }
          const googleId = (state as { googleId?: unknown }).googleId;
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
          console.error('Unable to load reading state', err);
        }
        if (active) {
          setReadingError('Unable to load your reading status.');
        }
      } finally {
        if (active) {
          setReadingLoading(false);
        }
      }
    };

    loadStatus();

    return () => {
      active = false;
    };
  }, [user?.id, decodedId, source]);

  useEffect(() => {
    if (source !== 'local' || !book?.id) {
      setReviews([]);
      return;
    }

    let active = true;

    const loadReviews = async () => {
      setReviewsLoading(true);
      setReviewsError(null);
      try {
        const data = await getReviewsByBook(book.id as string | number);
        if (!active) return;
        const list = Array.isArray(data) ? data : data ? [data] : [];
        setReviews(list);
      } catch (err) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('Unable to load reviews', err);
        }
        if (active) {
          setReviewsError('Unable to load reviews right now.');
        }
      } finally {
        if (active) {
          setReviewsLoading(false);
        }
      }
    };

    loadReviews();

    return () => {
      active = false;
    };
  }, [source, book?.id]);

  const updateField = <Key extends keyof LocalBook>(key: Key, value: LocalBook[Key]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const identifier =
    bookIdentifier ??
    (typeof book?.title === 'string' && book.title.trim() ? book.title : '') ??
    '';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isAdmin || source !== 'local') return;
    if (!identifier) {
      setError('This book cannot be modified because it is missing a title.');
      return;
    }

    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const updated = await updateBook(identifier, form);
      setSuccess('Book updated successfully.');
      setEditing(false);
      setBook((prev) => {
        if (updated) {
          return { ...(prev ?? {}), ...updated };
        }
        return prev ? { ...prev, ...form } : prev;
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

  const handleReadingStatusSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
          uiStatus: readingStatus,
        });
        if (result?.id) {
          setReadingStateId(String(result.id));
        }
      } else if (source === 'local') {
        if (!book?.id) {
          setReadingBusy(false);
          return;
        }
        if (readingStateId) {
          await updateReadingState(readingStateId, { status: readingStatus });
        } else {
          const created = await createReadingState({
            userId: user.id,
            bookId: book.id,
            status: readingStatus,
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

  const handleSubmitReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (source !== 'local' || !book?.id) return;
    if (!user?.id) {
      router.push(loginRedirect);
      return;
    }
    if (!reviewForm.text.trim()) {
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
        text: reviewForm.text,
        comment: reviewForm.text,
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

  if (!decodedId) {
    return null;
  }

  const displayTitle =
    (source === 'local' && book?.title) ||
    (source === 'google' && googleVolume?.volumeInfo?.title) ||
    'Book details';

  const displayAuthors =
    source === 'local'
      ? formatAuthors(book?.authors)
      : formatAuthors(googleVolume?.volumeInfo?.authors ?? []);

  const displayIsbn =
    source === 'local'
      ? book?.isbn
      : extractPrimaryIsbn(googleVolume) ?? undefined;

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

  return (
    <section className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{displayTitle}</h1>
          <p className="text-sm text-slate-500">
            {source === 'google'
              ? 'Details fetched from Google Books. Track the title directly from here.'
              : 'View book metadata, availability, and description.'}
          </p>
          {source === 'local' && !isAdmin ? (
            <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">
              Only administrators can edit or remove books.
            </p>
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
      {success ? <Toast message={success} type="success" onDismiss={() => setSuccess(null)} /> : null}
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
        <>
          <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
            <aside className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              {coverUrl ? (
                <div className="relative h-64 w-full overflow-hidden rounded-md border border-slate-100">
                  <Image
                    src={coverUrl}
                    alt={`${book.title ?? 'Book'} cover`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 280px"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="flex h-64 w-full items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-100 px-4 text-center text-sm text-slate-400">
                  No cover available
                </div>
              )}
              <dl className="space-y-2 text-sm text-slate-600">
                <div className="flex justify-between gap-4">
                  <dt className="font-medium text-slate-500">Title</dt>
                  <dd className="text-right text-slate-700">
                    {book.title ?? 'N/A'}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="font-medium text-slate-500">Authors</dt>
                  <dd className="text-right text-slate-700">
                    {formatAuthors(book.authors)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="font-medium text-slate-500">ISBN</dt>
                  <dd className="text-right text-slate-700">{book.isbn ?? 'N/A'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="font-medium text-slate-500">Catalog status</dt>
                  <dd className="text-right font-semibold uppercase text-blue-600">
                    {book.status ?? 'pending'}
                  </dd>
                </div>
                {publishedDate ? (
                  <div className="flex justify-between gap-4">
                    <dt className="font-medium text-slate-500">Published</dt>
                    <dd className="text-right text-slate-700">{publishedDate}</dd>
                  </div>
                ) : null}
              </dl>

              <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-800">Your reading status</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Track this title without leaving the details page.
                </p>
                {user ? (
                  <form onSubmit={handleReadingStatusSubmit} className="mt-3 space-y-3">
                    <Select
                      label="Status"
                      value={readingStatus}
                      onChange={(event) => setReadingStatus(event.target.value as UiStatus)}
                      options={readingStatusOptions}
                      disabled={readingLoading || readingBusy}
                    />
                    <button
                      type="submit"
                      className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                      disabled={readingLoading || readingBusy}
                    >
                      {readingBusy ? 'Saving...' : 'Update status'}
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => router.push(loginRedirect)}
                    className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-800"
                  >
                    Log in to track this book
                  </button>
                )}
              </div>
            </aside>
            <div className="space-y-4">
              {isAdmin && editing ? (
                <form
                  onSubmit={handleSubmit}
                  className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <Input
                      label="Title"
                      value={form.title}
                      onChange={(event) => updateField('title', event.target.value)}
                      required
                    />
                    <Input
                      label="Authors"
                      value={form.authors}
                      onChange={(event) => updateField('authors', event.target.value)}
                      required
                    />
                    <Input
                      label="ISBN"
                      value={form.isbn}
                      onChange={(event) => updateField('isbn', event.target.value)}
                      required
                    />
                    <Input
                      label="Cover URL"
                      value={form.cover ?? ''}
                      onChange={(event) => updateField('cover', event.target.value)}
                    />
                    <Select
                      label="Catalog status"
                      value={form.status ?? 'pending'}
                      onChange={(event) =>
                        updateField('status', event.target.value as LocalBook['status'])
                      }
                      options={catalogStatusOptions}
                    />
                    <Input
                      label="Published"
                      value={form.publishedDate ?? ''}
                      onChange={(event) => updateField('publishedDate', event.target.value)}
                    />
                  </div>
                  <Textarea
                    label="Description"
                    value={form.description ?? ''}
                    onChange={(event) => updateField('description', event.target.value)}
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
          </div>

          <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <header className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Community reviews</h2>
                <p className="text-sm text-slate-500">
                  Read what others think and add your perspective.
                </p>
              </div>
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
            ) : reviews.length ? (
              <ul className="space-y-4">
                {reviews.map((review) => (
                  <li
                    key={(review.id ?? crypto.randomUUID()).toString()}
                    className="rounded-md border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-800">
                        Rating: {Number(review.rating ?? review.status ?? 0) || 0}/5
                      </span>
                      <span className="text-xs text-slate-400">
                        {review.createdAt
                          ? new Date(review.createdAt).toLocaleDateString()
                          : 'Recently'}
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

            {user ? (
              <form
                onSubmit={handleSubmitReview}
                className="space-y-4 rounded-md border border-slate-200 bg-white p-5"
              >
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
        </>
      ) : source === 'google' && googleVolume ? (
        <>
          <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
            <aside className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              {coverUrl ? (
                <div className="relative h-64 w-full overflow-hidden rounded-md border border-slate-100">
                  <Image
                    src={coverUrl}
                    alt={`${displayTitle} cover`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 280px"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="flex h-64 w-full items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-100 px-4 text-center text-sm text-slate-400">
                  No cover available
                </div>
              )}
              <dl className="space-y-2 text-sm text-slate-600">
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
                {publishedDate ? (
                  <div className="flex justify-between gap-4">
                    <dt className="font-medium text-slate-500">Published</dt>
                    <dd className="text-right text-slate-700">{publishedDate}</dd>
                  </div>
                ) : null}
                {googleVolume.volumeInfo?.printType ? (
                  <div className="flex justify-between gap-4">
                    <dt className="font-medium text-slate-500">Format</dt>
                    <dd className="text-right text-slate-700">
                      {googleVolume.volumeInfo.printType}
                    </dd>
                  </div>
                ) : null}
              </dl>

              <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-800">Your reading status</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Save this Google Books title to your reading log.
                </p>
                {user ? (
                  <form onSubmit={handleReadingStatusSubmit} className="mt-3 space-y-3">
                    <Select
                      label="Status"
                      value={readingStatus}
                      onChange={(event) => setReadingStatus(event.target.value as UiStatus)}
                      options={readingStatusOptions}
                      disabled={readingLoading || readingBusy}
                    />
                    <button
                      type="submit"
                      className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                      disabled={readingLoading || readingBusy}
                    >
                      {readingBusy ? 'Saving...' : 'Update status'}
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => router.push(loginRedirect)}
                    className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-800"
                  >
                    Log in to track this book
                  </button>
                )}
              </div>
            </aside>

            <article className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-800">Description</h2>
              <p className="text-sm text-slate-600">
                {description ?? 'No description provided for this Google Books entry.'}
              </p>
            </article>
          </div>

          <section className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800">Community reviews</h2>
            <p className="mt-2">
              Reviews are available for titles saved in the library catalog. Save this
              book to your reading log to start a discussion once it becomes available
              locally.
            </p>
          </section>
        </>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          Book not found.
        </div>
      )}
    </section>
  );
};

export default BookDetailPage;
