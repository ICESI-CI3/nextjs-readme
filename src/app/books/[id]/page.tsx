'use client';

import { FormEvent, useEffect, useState } from 'react';
import { notFound, useParams, useRouter } from 'next/navigation';
import Input from '@/components/Form/Input';
import Select from '@/components/Form/Select';
import Textarea from '@/components/Form/Textarea';
import Toast from '@/components/Toast';
import { deleteBook, getBookById, updateBook } from '@/services/bookService';
import { useAuthStore } from '@/stores/authStore';

type Book = {
  id?: string | number;
  title?: string;
  authors?: string;
  isbn?: string;
  cover?: string;
  status?: 'pending' | 'reading' | 'read' | string;
  description?: string;
};

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'reading', label: 'Reading' },
  { value: 'read', label: 'Read' },
];

const BookDetailPage = () => {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const role = useAuthStore((state) => state.user?.role ?? 'reader');
  const isAdmin = (role ?? 'reader').toString().toLowerCase() === 'admin';

  const [book, setBook] = useState<Book | null>(null);
  const [form, setForm] = useState<Book>({
    title: '',
    authors: '',
    isbn: '',
    cover: '',
    status: 'pending',
    description: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const bookId = params?.id ? decodeURIComponent(params.id) : null;

  useEffect(() => {
    if (!bookId) {
      notFound();
      return;
    }

    let active = true;

    const loadBook = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getBookById(bookId);
        if (!active) return;
        if (!data) {
          notFound();
          return;
        }
        setBook(data);
        setForm({
          title: data.title ?? '',
          authors: data.authors ?? '',
          isbn: data.isbn ?? '',
          cover: data.cover ?? '',
          status: (data.status as Book['status']) ?? 'pending',
          description: data.description ?? '',
        });
      } catch (err) {
        console.error('Failed to load book', err);
        if (!active) return;
        setError('Unable to load this book. It may have been removed.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadBook();

    return () => {
      active = false;
    };
  }, [bookId]);

  useEffect(() => {
    if (!isAdmin && editing) {
      setEditing(false);
    }
  }, [isAdmin, editing]);

  const updateField = <Key extends keyof Book>(key: Key, value: Book[Key]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const identifier = book?.id ?? book?.title ?? bookId ?? '';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isAdmin || !identifier) return;

    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      await updateBook(identifier, {
        title: form.title,
        authors: form.authors,
        isbn: form.isbn,
        cover: form.cover,
        status: form.status,
        description: form.description,
      });
      setSuccess('Book updated.');
      setEditing(false);
      setBook((prev) => (prev ? { ...prev, ...form } : prev));
    } catch (err) {
      console.error('Update failed', err);
      setError('Update failed. Please check the fields and try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isAdmin || !identifier) return;
    setError(null);
    setRemoving(true);
    try {
      await deleteBook(identifier);
      router.push('/books');
    } catch (err) {
      console.error('Delete failed', err);
      setError('Unable to delete this book right now.');
    } finally {
      setRemoving(false);
    }
  };

  if (!bookId) {
    return null;
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{book?.title ?? 'Book details'}</h1>
          <p className="text-sm text-slate-500">View book metadata, availability, and description.</p>
          {!isAdmin ? (
            <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">
              Only administrators can edit or remove books.
            </p>
          ) : null}
        </div>
        {isAdmin ? (
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
              disabled={loading || removing}
            >
              {removing ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        ) : null}
      </header>

      {error ? <Toast message={error} type="error" onDismiss={() => setError(null)} /> : null}
      {success ? <Toast message={success} type="success" onDismiss={() => setSuccess(null)} /> : null}

      {loading ? (
        <div className="space-y-4">
          <div className="h-48 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-24 animate-pulse rounded-lg bg-slate-200" />
        </div>
      ) : book ? (
        <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
          <aside className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            {book.cover ? (
              <div className="relative h-64 w-full overflow-hidden rounded-md border border-slate-100">
                <img src={book.cover} alt={book.title ?? 'Book cover'} className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="flex h-64 w-full items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-100 text-sm text-slate-400">
                No cover available
              </div>
            )}
            <dl className="space-y-2 text-sm text-slate-600">
              <div className="flex justify-between">
                <dt className="font-medium text-slate-500">Title</dt>
                <dd className="text-right text-slate-700">{book.title ?? 'N/A'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium text-slate-500">Authors</dt>
                <dd className="text-right text-slate-700">{book.authors ?? 'N/A'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium text-slate-500">ISBN</dt>
                <dd className="text-right text-slate-700">{book.isbn ?? 'N/A'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium text-slate-500">Status</dt>
                <dd className="text-right font-semibold uppercase text-blue-600">
                  {book.status ?? 'pending'}
                </dd>
              </div>
            </dl>
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
                    label="Status"
                    value={form.status ?? 'pending'}
                    onChange={(event) => updateField('status', event.target.value as Book['status'])}
                    options={statusOptions}
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
                <p className="text-sm text-slate-600">{book.description ?? 'No description provided yet.'}</p>
              </article>
            )}
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
