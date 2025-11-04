'use client';

import { FormEvent, useEffect, useState } from 'react';
import { notFound, useParams, useRouter } from 'next/navigation';
import Input from '@/components/Form/Input';
import Select from '@/components/Form/Select';
import Textarea from '@/components/Form/Textarea';
import Toast from '@/components/Toast';
import { deleteReview, getReviewById, updateReview } from '@/services/reviewService';
import { useAuthStore } from '@/stores/authStore';

type Review = {
  id?: string | number;
  rating?: number;
  comment?: string;
  text?: string;
  status?: string;
  book?: { id?: string | number; title?: string };
  user?: { id?: string | number; name?: string; email?: string };
};

type ReviewForm = {
  rating: string;
  text: string;
  status: string;
};

const defaultForm: ReviewForm = {
  rating: '5',
  text: '',
  status: 'approved',
};

const ReviewDetailPage = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const role = useAuthStore((state) => state.user?.role ?? 'reader');
  const [review, setReview] = useState<Review | null>(null);
  const [form, setForm] = useState<ReviewForm>(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const reviewId = params?.id ? decodeURIComponent(params.id) : null;

  useEffect(() => {
    if (!reviewId) {
      notFound();
      return;
    }

    let active = true;

    const loadReview = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getReviewById(reviewId);
        if (!active) return;
        if (!data) {
          notFound();
          return;
        }
        setReview(data);
        setForm({
          rating: String(data.rating ?? '5'),
          text: data.comment ?? data.text ?? '',
          status: data.status ?? 'approved',
        });
      } catch (err) {
        console.error('Unable to load review', err);
        if (!active) return;
        setError('Unable to load this review. It may have been removed.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadReview();

    return () => {
      active = false;
    };
  }, [reviewId]);

  const updateField = <Key extends keyof ReviewForm>(key: Key, value: ReviewForm[Key]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      await updateReview(reviewId ?? '', {
        rating: Number(form.rating),
        text: form.text,
        comment: form.text,
        status: form.status,
      });
      setSuccess('Review updated.');
      setReview((prev) =>
        prev
          ? {
              ...prev,
              rating: Number(form.rating),
              comment: form.text,
              text: form.text,
              status: form.status,
            }
          : prev,
      );
      setEditing(false);
    } catch (err) {
      console.error('Update failed', err);
      setError('Update failed. Please review the fields and try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setError(null);
    setRemoving(true);
    try {
      await deleteReview(reviewId ?? '');
      router.push('/reviews');
    } catch (err) {
      console.error('Delete failed', err);
      setError('Unable to delete this review right now.');
    } finally {
      setRemoving(false);
    }
  };

  if (!reviewId) return null;

  return (
    <section className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Review for {review?.book?.title ?? 'Unknown book'}</h1>
          <p className="text-sm text-slate-500">Update the rating, edit the feedback, or moderate the review.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setEditing((prev) => !prev)}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-800"
            disabled={loading}
          >
            {editing ? 'Cancel editing' : 'Edit review'}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="rounded-md border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:border-rose-300 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={loading || removing}
          >
            {removing ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </header>

      {error ? <Toast message={error} type="error" onDismiss={() => setError(null)} /> : null}
      {success ? <Toast message={success} type="success" onDismiss={() => setSuccess(null)} /> : null}

      {loading ? (
        <div className="space-y-3">
          <div className="h-20 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-32 animate-pulse rounded-lg bg-slate-200" />
        </div>
      ) : review ? (
        <div className="space-y-4">
          <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Book</dt>
                <dd className="mt-1 text-sm font-medium text-slate-800">{review.book?.title ?? 'Unknown book'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Reviewer</dt>
                <dd className="mt-1 text-sm text-slate-600">
                  {review.user?.name ?? review.user?.email ?? 'Unknown user'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Rating</dt>
                <dd className="mt-1 text-sm text-slate-600">{review.rating ?? '—'} / 5</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</dt>
                <dd className="mt-1 text-sm font-semibold uppercase text-blue-600">{review.status ?? 'approved'}</dd>
              </div>
            </dl>
          </article>

          {editing ? (
            <form
              onSubmit={handleSubmit}
              className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  label="Rating"
                  value={form.rating}
                  onChange={(event) => updateField('rating', event.target.value)}
                  options={[
                    { value: '5', label: '5 - Excellent' },
                    { value: '4', label: '4 - Good' },
                    { value: '3', label: '3 - Average' },
                    { value: '2', label: '2 - Fair' },
                    { value: '1', label: '1 - Poor' },
                  ]}
                />
                {role === 'admin' ? (
                  <Select
                    label="Moderation status"
                    value={form.status}
                    onChange={(event) => updateField('status', event.target.value)}
                    options={[
                      { value: 'approved', label: 'Approved' },
                      { value: 'pending', label: 'Pending' },
                      { value: 'rejected', label: 'Rejected' },
                    ]}
                  />
                ) : (
                  <Input label="Status" value={form.status} readOnly />
                )}
              </div>
              <Textarea
                label="Review"
                value={form.text}
                onChange={(event) => updateField('text', event.target.value)}
                required
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
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          ) : (
            <article className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-800">Review text</h2>
              <p className="text-sm text-slate-600">{review.comment ?? review.text ?? 'No content provided.'}</p>
            </article>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          Review not found.
        </div>
      )}
    </section>
  );
};

export default ReviewDetailPage;
