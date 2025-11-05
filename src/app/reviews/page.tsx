'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Input from '@/components/Form/Input';
import Select from '@/components/Form/Select';
import Toast from '@/components/Toast';
import { getReviews } from '@/services/reviewService';

type Review = {
  id?: string | number;
  rating?: number;
  comment?: string;
  text?: string;
  book?: { id?: string | number; title?: string };
  bookId?: string | number;
  user?: { id?: string | number; name?: string; email?: string };
  userId?: string | number;
  status?: string;
};

const PAGE_SIZE = 10;

const ReviewsPage = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadReviews = async () => {
      setLoading(true);
      setError(null);
      try {
        const list = await getReviews();
        if (!active) return;
        const normalized = Array.isArray(list) ? list : list ? [list] : [];
        setReviews(normalized);
      } catch (err) {
        console.error('Unable to fetch reviews', err);
        if (!active) return;
        setError('Unable to load reviews. Please try again later.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadReviews();

    return () => {
      active = false;
    };
  }, []);

  const filteredReviews = useMemo(() => {
    return reviews.filter((review) => {
      const rating = review.rating ?? 0;
      const matchesRating = ratingFilter === 'all' ? true : rating === Number(ratingFilter);
      const content = `${review.comment ?? ''} ${review.text ?? ''} ${
        review.book?.title ?? ''
      } ${review.user?.name ?? ''}`.toLowerCase();
      const matchesSearch = content.includes(searchTerm.toLowerCase());
      return matchesRating && matchesSearch;
    });
  }, [reviews, ratingFilter, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredReviews.length / PAGE_SIZE));

  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredReviews.slice(start, start + PAGE_SIZE);
  }, [filteredReviews, page]);

  return (
    <section className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Reviews</h1>
          <p className="text-sm text-slate-500">Review feedback from readers and keep ratings consistent.</p>
        </div>
        <Link
          href="/reviews/new"
          className="inline-flex h-11 items-center rounded-md bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Add review
        </Link>
      </header>

      {error ? <Toast message={error} type="error" onDismiss={() => setError(null)} /> : null}

      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row">
        <div className="flex-1">
          <Input
            label="Search"
            placeholder="Search reviews, books, or readers"
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            label="Rating"
            value={ratingFilter}
            onChange={(event) => {
              setRatingFilter(event.target.value);
              setPage(1);
            }}
            options={[
              { value: 'all', label: 'All ratings' },
              { value: '5', label: '5 stars' },
              { value: '4', label: '4 stars' },
              { value: '3', label: '3 stars' },
              { value: '2', label: '2 stars' },
              { value: '1', label: '1 star' },
            ]}
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-lg bg-slate-200" />
          ))}
        </div>
      ) : pageItems.length ? (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Book</th>
                <th className="px-4 py-3">Reviewer</th>
                <th className="px-4 py-3">Rating</th>
                <th className="px-4 py-3">Excerpt</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-600">
              {pageItems.map((review, index) => (
                <tr key={(review.id ?? index).toString()}>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {review.book?.title ?? `Book #${review.bookId ?? '—'}`}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {review.user?.name ?? review.user?.email ?? `User #${review.userId ?? '—'}`}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-600">
                      {review.rating ?? '—'} / 5
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {(review.comment ?? review.text ?? '').slice(0, 80) || 'No feedback provided.'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/reviews/${review.id ?? review.bookId ?? index}`} className="text-sm font-medium text-blue-600 hover:text-blue-700">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
          <h2 className="text-lg font-semibold text-slate-800">No reviews yet</h2>
          <p className="mt-2 text-sm text-slate-500">Encourage readers to share their thoughts on books they finish.</p>
          <Link
            href="/reviews/new"
            className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Create a review
          </Link>
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

export default ReviewsPage;
