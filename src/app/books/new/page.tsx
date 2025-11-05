'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Input from '@/components/Form/Input';
import Select from '@/components/Form/Select';
import Textarea from '@/components/Form/Textarea';
import Toast from '@/components/Toast';
import GoogleBooksSearch from '@/components/Books/GoogleBooksSearch';
import { createBook } from '@/services/bookService';
import { useAuthStore } from '@/stores/authStore';

type BookForm = {
  title: string;
  authors: string;
  isbn: string;
  cover: string;
  status: 'pending' | 'reading' | 'read';
  description: string;
};

const defaultValues: BookForm = {
  title: '',
  authors: '',
  isbn: '',
  cover: '',
  status: 'pending',
  description: '',
};

const BookCreatePage = () => {
  const router = useRouter();
  const role = useAuthStore((state) => state.user?.role ?? 'reader');
  const isAdmin = (role ?? 'reader').toString().toLowerCase() === 'admin';

  const [form, setForm] = useState<BookForm>(defaultValues);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const updateField = <Key extends keyof BookForm>(key: Key, value: BookForm[Key]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validateForm = () => {
    if (!form.title.trim()) {
      setError('Title is required.');
      return false;
    }
    if (!form.authors.trim()) {
      setError('At least one author is required.');
      return false;
    }
    if (!form.isbn.trim()) {
      setError('ISBN is required.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isAdmin) return;

    setError(null);
    setSuccess(null);

    if (!validateForm()) return;

    setSubmitting(true);
    try {
      await createBook(form);
      setSuccess('Book created successfully.');
      setTimeout(() => router.push('/books'), 1000);
    } catch (err) {
      console.error('Failed to create book', err);
      setError('Saving failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAdmin) {
    return (
      <section className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-slate-900">Add a new book</h1>
          <p className="text-sm text-slate-500">
            Only administrators can add or edit books. If you need a new title, please contact an administrator.
          </p>
        </header>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Add a new book</h1>
        <p className="text-sm text-slate-500">Fill the form or pull details from Google Books to speed things up.</p>
      </header>

      {error ? <Toast message={error} type="error" onDismiss={() => setError(null)} /> : null}
      {success ? <Toast message={success} type="success" onDismiss={() => setSuccess(null)} /> : null}

      <GoogleBooksSearch
        onSelect={(book) => {
          updateField('title', book.title ?? '');
          updateField('authors', (book.authors as string) ?? '');
          updateField('isbn', book.isbn ?? '');
          updateField('cover', book.cover ?? '');
          updateField('description', book.description ?? '');
        }}
      />

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
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
            placeholder="Separate multiple authors with commas"
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
            value={form.cover}
            onChange={(event) => updateField('cover', event.target.value)}
            placeholder="https://..."
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Select
            label="Status"
            value={form.status}
            onChange={(event) => updateField('status', event.target.value as BookForm['status'])}
            options={[
              { value: 'pending', label: 'Pending' },
              { value: 'reading', label: 'Reading' },
              { value: 'read', label: 'Read' },
            ]}
          />
        </div>

        <Textarea
          label="Description"
          value={form.description}
          onChange={(event) => updateField('description', event.target.value)}
          placeholder="Short summary or notes."
        />

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push('/books')}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            disabled={submitting}
          >
            {submitting ? 'Saving...' : 'Create book'}
          </button>
        </div>
      </form>
    </section>
  );
};

export default BookCreatePage;
