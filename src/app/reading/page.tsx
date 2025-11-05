'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Select from '@/components/Form/Select';
import Textarea from '@/components/Form/Textarea';
import Toast from '@/components/Toast';
import { useAuthStore } from '@/stores/authStore';
import {
  createReadingState,
  deleteReadingState,
  getReadingStatesByUser,
  updateReadingState,
} from '@/services/readingStateService';
import { getAllBooks } from '@/services/bookService';
import {
  deleteLocalReadingState,
  getLocalReadingStates,
  updateLocalReadingState,
  LocalReadingState,
} from '@/services/localReadingStateService';

type BookOption = {
  id: string;
  title: string;
};

type ReadingState = {
  id?: string | number;
  bookId?: string | number;
  book?: { id?: string | number; title?: string };
  title?: string;
  authors?: string;
  cover?: string;
  description?: string;
  source?: string;
  googleId?: string;
  status?: string;
  notes?: string;
  updatedAt?: string;
  createdAt?: string;
  origin?: 'remote' | 'local';
};

type EditableState = {
  status: string;
  notes: string;
};

const statusOptions = [
  { value: 'to-read', label: 'To read' },
  { value: 'reading', label: 'Reading' },
  { value: 'completed', label: 'Completed' },
];

const toUiStatus = (status: unknown): string => {
  if (typeof status !== 'string') return 'reading';
  const normalized = status.trim().toLowerCase();
  if (!normalized) return 'reading';
  if (normalized === 'pending' || normalized === 'to-read' || normalized === 'to read') {
    return 'to-read';
  }
  if (normalized === 'read' || normalized === 'completed' || normalized === 'complete') {
    return 'completed';
  }
  if (normalized === 'reading') {
    return 'reading';
  }
  return 'reading';
};

const defaultNewState = {
  bookId: '',
  status: 'reading',
  notes: '',
};

const ReadingLogPage = () => {
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.user?.role ?? 'reader');
  const normalizedRole = (role ?? 'reader').toString().toLowerCase();
  const isAdmin = normalizedRole === 'admin';
  const [states, setStates] = useState<ReadingState[]>([]);
  const [edits, setEdits] = useState<Record<string, EditableState>>({});
  const [books, setBooks] = useState<BookOption[]>([]);
  const [newState, setNewState] = useState(defaultNewState);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | number | null>(null);
  const [removingId, setRemovingId] = useState<string | number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const [readingStates, bookList] = await Promise.all([
          getReadingStatesByUser(String(user.id)),
          isAdmin ? getAllBooks() : Promise.resolve(null),
        ]);

        if (!active) return;

        const normalizedStates: ReadingState[] = Array.isArray(readingStates)
          ? readingStates
          : readingStates
          ? [readingStates]
          : [];

        const localStates: ReadingState[] = user.id
          ? getLocalReadingStates(String(user.id)).map((state: LocalReadingState) => ({
              ...state,
              id: state.id,
              bookId: state.bookId ?? state.googleId ?? state.id,
              title: state.title,
              authors: state.authors,
              description: state.description,
              status: toUiStatus(state.status),
              notes: state.notes,
              createdAt: state.createdAt,
              updatedAt: state.updatedAt,
              source: 'google',
              origin: 'local' as const,
            }))
          : [];

        const remoteStates = normalizedStates.map((state) => ({
          ...state,
          status: toUiStatus(
            (state as { status?: unknown }).status ?? (state as { state?: unknown }).state,
          ),
          origin: 'remote' as const,
        }));

        const combinedStates = [...localStates, ...remoteStates];

        const normalizedBooks: BookOption[] = isAdmin
          ? (Array.isArray(bookList) ? bookList : bookList ? [bookList] : [])
              .map((book) => ({
                id: (book.id ?? book.title ?? '').toString(),
                title: book.title ?? String(book.id ?? 'Unknown book'),
              }))
              .filter((option) => option.id)
          : [];

        setStates(combinedStates);
        setBooks(normalizedBooks);

        const nextEdits: Record<string, EditableState> = {};
        combinedStates.forEach((state) => {
          const key = state.id ? String(state.id) : state.bookId ? String(state.bookId) : null;
          if (key) {
            nextEdits[key] = {
              status: toUiStatus(state.status),
              notes: state.notes ? String(state.notes) : '',
            };
          }
        });
        setEdits(nextEdits);
      } catch (err) {
        console.error('Unable to load reading states', err);
        if (!active) return;
        setError('Unable to load your reading activity right now.');
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
  }, [user?.id, isAdmin]);

  const availableBooks = useMemo(() => {
    if (!isAdmin) return [];
    return books.filter(
      (book) =>
        !states.some(
          (state) =>
            state.origin === 'remote' &&
            String(state.bookId ?? state.book?.id ?? '') === book.id,
        ),
    );
  }, [books, states, isAdmin]);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isAdmin) return;
    setError(null);
    setInfo(null);

    if (!newState.bookId) {
      setError('Choose a book to start tracking.');
      return;
    }

    setCreating(true);
    try {
      const response = await createReadingState({
        bookId: newState.bookId,
        status: newState.status,
        notes: newState.notes?.trim() ? newState.notes.trim() : undefined,
      });
      const created = Array.isArray(response) ? response[0] : response?.readingState ?? response ?? null;
      if (created) {
        const createdStatus = toUiStatus(
          (created as { status?: unknown }).status ?? (created as { state?: unknown }).state ?? newState.status,
        );
        const normalizedCreated: ReadingState = {
          ...(created as ReadingState),
          status: createdStatus,
          origin: 'remote',
        };
        setStates((prev) => [normalizedCreated, ...prev]);
        const key = created.id ? String(created.id) : created.bookId ? String(created.bookId) : null;
        if (key) {
          setEdits((prev) => ({
            ...prev,
            [key]: {
              status: createdStatus,
              notes: created.notes ? String(created.notes) : newState.notes,
            },
          }));
        }
      }
      setInfo('Reading started.');
      setNewState(defaultNewState);
    } catch (err) {
      console.error('Unable to create reading state', err);
      setError('Could not start the reading entry. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleEditChange = (id: string, field: keyof EditableState, value: string) => {
    setEdits((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const handleUpdate = async (state: ReadingState) => {
    if (!state.id) return;
    const key = String(state.id);
    const changes = edits[key];
    if (!changes) return;

    setUpdatingId(state.id);
    setError(null);
    setInfo(null);
    try {
      if (state.origin === 'local') {
        if (!user?.id) {
          throw new Error('Your session is required to update this entry.');
        }
        const updated = updateLocalReadingState(
          String(user.id),
          String(state.id),
          {
            status: changes.status,
            notes: changes.notes,
          },
        );
        if (updated) {
          setStates((prev) =>
            prev.map((item) =>
              item.id === state.id
                ? {
                    ...item,
                    status: updated.status,
                    notes: updated.notes ?? '',
                    updatedAt: updated.updatedAt,
                  }
                : item,
            ),
          );
        }
      } else {
        await updateReadingState(String(state.id), {
          status: changes.status,
          notes: changes.notes,
        });
        setStates((prev) =>
          prev.map((item) =>
            item.id === state.id
              ? {
                  ...item,
                  status: changes.status,
                  notes: changes.notes,
                }
              : item,
          ),
        );
      }
      setInfo('Reading state updated.');
    } catch (err) {
      console.error('Unable to update reading state', err);
      setError('We could not update this entry.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (state: ReadingState) => {
    if (!state.id) return;
    setRemovingId(state.id);
    setError(null);
    setInfo(null);
    try {
      if (state.origin === 'local') {
        if (!user?.id) {
          throw new Error('Your session is required to remove this entry.');
        }
        deleteLocalReadingState(String(user.id), String(state.id));
      } else {
        await deleteReadingState(String(state.id));
      }
      setStates((prev) => prev.filter((item) => item.id !== state.id));
      setEdits((prev) => {
        const next = { ...prev };
        delete next[String(state.id)];
        return next;
      });
      setInfo('Reading entry removed.');
    } catch (err) {
      console.error('Unable to delete reading state', err);
      setError('We could not delete this entry.');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Reading log</h1>
        <p className="text-sm text-slate-500">
          Track what you are reading, update progress, and archive completed titles.
        </p>
      </header>

      {error ? <Toast message={error} type="error" onDismiss={() => setError(null)} /> : null}
      {info ? <Toast message={info} type="success" onDismiss={() => setInfo(null)} /> : null}

      {isAdmin ? (
        <form
          onSubmit={handleCreate}
          className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Book"
              value={newState.bookId}
              onChange={(event) => setNewState((prev) => ({ ...prev, bookId: event.target.value }))}
              required
              options={[
                { value: '', label: availableBooks.length ? 'Select a book' : 'No books available' },
                ...availableBooks.map((book) => ({ value: book.id, label: book.title })),
              ]}
            />
            <Select
              data-testid="status-new"
              label="Status"
              value={newState.status}
              onChange={(event) => setNewState((prev) => ({ ...prev, status: event.target.value }))}
              options={statusOptions}
            />
          </div>
          <Textarea
            label="Notes (optional)"
            value={newState.notes}
            onChange={(event) => setNewState((prev) => ({ ...prev, notes: event.target.value }))}
            placeholder="Add thoughts, progress details, or goals."
          />
          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              disabled={creating || !availableBooks.length}
            >
              {creating ? 'Saving...' : 'Start reading'}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          <h2 className="text-base font-semibold text-slate-800">Ready to track a new book?</h2>
          <p>
            Browse the catalog in{' '}
            <Link className="font-semibold text-blue-600 hover:text-blue-700" href="/books">
              Books
            </Link>{' '}
            and click &lsquo;Save to reading log&rsquo; from any title to add it here. Administrators can also register internal
            catalog titles from this page.
          </p>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-lg bg-slate-200" />
          ))}
        </div>
      ) : states.length ? (
        <div className="space-y-4">
          {states.map((state) => {
            const key = state.id ? String(state.id) : state.bookId ? String(state.bookId) : '';
            const edit = key ? edits[key] : undefined;
            const resolvedTitle =
              state.title ?? state.book?.title ?? books.find((book) => book.id === key)?.title ?? 'Book';
            const detailHref = state.source === 'google'
              ? state.googleId
                ? `/books/google/${state.googleId}`
                : state.bookId
                ? `/books/google/${state.bookId}`
                : null
              : state.book?.id || state.bookId
              ? `/books/${state.book?.id ?? state.bookId}`
              : null;
            return (
              <article
                key={key || Math.random().toString(36)}
                className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
              >
                <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-800">{resolvedTitle}</h2>
                    <p className="text-xs text-slate-500">
                      Last update:{' '}
                      {state.updatedAt
                        ? new Date(state.updatedAt).toLocaleString()
                        : state.createdAt
                        ? new Date(state.createdAt).toLocaleString()
                        : 'Not available'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {state.origin === 'local' ? (
                      <span className="rounded-full border border-amber-300 px-3 py-1 text-xs font-semibold uppercase text-amber-600">
                        Local entry
                      </span>
                    ) : null}
                    {detailHref ? (
                      <Link
                        href={detailHref}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        View book
                      </Link>
                    ) : null}
                  </div>
                </header>

                <div className="grid gap-4 md:grid-cols-2">
                  <Select
                    label="Status"
                    value={edit?.status ?? state.status ?? 'reading'}
                    onChange={(event) => key && handleEditChange(key, 'status', event.target.value)}
                    options={statusOptions}
                  />
                  <Textarea
                    label="Notes"
                    value={edit?.notes ?? state.notes ?? ''}
                    onChange={(event) => key && handleEditChange(key, 'notes', event.target.value)}
                    placeholder="Update your thoughts or progress."
                  />
                </div>

                <div className="flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => handleUpdate(state)}
                    className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!key || updatingId === state.id}
                  >
                    {updatingId === state.id ? 'Updating...' : 'Save changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(state)}
                    className="rounded-md border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:border-rose-300 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!key || removingId === state.id}
                  >
                    {removingId === state.id ? 'Removing...' : 'Delete'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          <h2 className="text-lg font-semibold text-slate-800">No reading tracked yet</h2>
          <p className="mt-2">
            Start a reading entry to keep track of your progress and completion dates.
          </p>
        </div>
      )}
    </section>
  );
};

export default ReadingLogPage;
