'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Select from '@/components/Form/Select';
import Textarea from '@/components/Form/Textarea';
import Toast from '@/components/Toast';
import { createReview } from '@/services/reviewService';
import { getAllBooks } from '@/services/bookService';
import { useAuthStore } from '@/stores/authStore';

type BookOption = {
  id: string | number;
  title: string;
};

type ReviewForm = {
  bookId: string;
  rating: string;
  text: string;
};

const defaultForm: ReviewForm = {
  bookId: '',
  rating: '5',
  text: '',
};

const ReviewCreatePage = () => {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [books, setBooks] = useState<BookOption[]>([]);
  const [form, setForm] = useState<ReviewForm>(defaultForm);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    const loadBooks = async () => {
      setLoadingBooks(true);
      try {
        const list = await getAllBooks();
        if (!active) return;
        const options = Array.isArray(list)
          ? list
          : list
            ? [list]
            : [];
        setBooks(
          options
            .filter((book) => book && (book.id || book.title))
            .map((book) => ({
              id: (book.id ?? book.title ?? '').toString(),
              title: book.title ?? String(book.id),
            })),
        );
      } catch (err) {
        console.error('Unable to load books', err);
        if (!active) return;
        setError('Unable to load books for selection.');
      } finally {
        if (active) {
          setLoadingBooks(false);
        }
      }
    };

    loadBooks();
    return () => {
      active = false;
    };
  }, []);

  const updateField = <Key extends keyof ReviewForm>(key: Key, value: ReviewForm[Key]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validateForm = () => {
    if (!form.bookId) {
      setError('Choose the book you are reviewing.');
      return false;
    }
    const ratingValue = Number(form.rating);
    if (Number.isNaN(ratingValue) || ratingValue < 1 || ratingValue > 5) {
      setError('Rating must be between 1 and 5.');
      return false;
    }
    if (!form.text.trim()) {
      setError('Write a short review.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      await createReview({
        bookId: form.bookId,
        rating: Number(form.rating),
        text: form.text,
        comment: form.text,
        userId: user?.id,
      });
      setSuccess('Review created successfully.');
      setTimeout(() => router.push('/reviews'), 1000);
    } catch (err) {
      console.error('Failed to create review', err);
      setError('Could not save the review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Create a review</h1>
        <p className="text-sm text-slate-500">Share your feedback about a book and rate your experience.</p>
      </header>

      {error ? <Toast message={error} type="error" onDismiss={() => setError(null)} /> : null}
      {success ? <Toast message={success} type="success" onDismiss={() => setSuccess(null)} /> : null}

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <Select
            label="Book"
            value={form.bookId}
            onChange={(event) => updateField('bookId', event.target.value)}
            required
            data-testid="book-select"
            options={[
              { value: '', label: loadingBooks ? 'Loading books…' : 'Select a book' },
              ...books.map((book) => ({ value: book.id, label: book.title })),
            ]}
          />

          <Select
            label="Rating"
            value={form.rating}
            onChange={(event) => updateField('rating', event.target.value)}
            required
            data-testid="rating-select"
            options={[
              { value: '5', label: '5 - Excellent' },
              { value: '4', label: '4 - Good' },
              { value: '3', label: '3 - Average' },
              { value: '2', label: '2 - Fair' },
              { value: '1', label: '1 - Poor' },
            ]}
          />
        </div>
        <Textarea
          label="Review"
          value={form.text}
          onChange={(event) => updateField('text', event.target.value)}
          placeholder="What stood out to you?"
          required
        />
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push('/reviews')}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            disabled={submitting}
          >
            {submitting ? 'Saving…' : 'Create review'}
          </button>
        </div>
      </form>
    </section>
  );
};

export default ReviewCreatePage;
