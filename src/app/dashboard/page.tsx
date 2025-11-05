'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Toast from '@/components/Toast';
import { useAuthStore } from '@/stores/authStore';
import { getAllBooks } from '@/services/bookService';
import { getReadingClubs } from '@/services/readingClubService';
import { getReviews } from '@/services/reviewService';
import { getAllReadingStates } from '@/services/readingStateService';

type DashboardCounts = {
  books: number;
  clubs: number;
  reviews: number;
  readingStates: number;
};

const initialCounts: DashboardCounts = {
  books: 0,
  clubs: 0,
  reviews: 0,
  readingStates: 0,
};

const DashboardPage = () => {
  const user = useAuthStore((state) => state.user);
  const role = user?.role ?? 'reader';
  const normalizedRole = role.toString().toLowerCase();
  const isAdmin = normalizedRole === 'admin';

  const [counts, setCounts] = useState<DashboardCounts>(initialCounts);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setError(null);
      setLoading(true);
      try {
        const [books, clubs, reviews, readingStates] = await Promise.all([
          getAllBooks(),
          getReadingClubs(),
          getReviews(),
          getAllReadingStates(),
        ]);

        if (!active) return;

        setCounts({
          books: Array.isArray(books) ? books.length : 0,
          clubs: Array.isArray(clubs) ? clubs.length : 0,
          reviews: Array.isArray(reviews) ? reviews.length : 0,
          readingStates: Array.isArray(readingStates) ? readingStates.length : 0,
        });
      } catch (err) {
        console.error('Failed to load dashboard metrics', err);
        if (!active) return;
        setError('Unable to load latest metrics. Please retry in a few seconds.');
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
  }, []);

  const widgets = [
    {
      label: 'Books in library',
      value: counts.books,
      href: '/books',
      actionLabel: 'Browse books',
    },
    {
      label: 'Reading clubs',
      value: counts.clubs,
      href: '/clubs',
      actionLabel: 'Open clubs',
    },
    {
      label: 'Reviews logged',
      value: counts.reviews,
      href: '/reviews',
      actionLabel: 'See reviews',
    },
    {
      label: 'Active progress entries',
      value: counts.readingStates,
      href: isAdmin ? '/reports' : '/reading',
      actionLabel: isAdmin ? 'View reports' : 'Open reading log',
    },
  ];

  const quickActions = useMemo(
    () => [
      { label: 'New book', href: '/books/new', roles: ['admin'] },
      { label: 'New review', href: '/reviews/new' },
      { label: 'New club', href: '/clubs/new' },
      { label: 'View reports', href: '/reports', roles: ['admin'] },
    ],
    [],
  );

  const visibleQuickActions = quickActions.filter(
    (action) => !action.roles || action.roles.includes(normalizedRole),
  );

  const nextSteps = isAdmin
    ? [
        'Review pending books to mark as reading or read.',
        'Create club discussions to spark conversations.',
        'Export the latest monthly progress report.',
      ]
    : [
        'Start a new reading entry from the catalog.',
        'Join a club to discuss your current reads.',
        'Share a review once you finish a book.',
      ];

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Welcome back{user?.name ? `, ${user.name}` : ''}.</h1>
        <p className="text-sm text-slate-500">
          Keep track of the latest activity across books, clubs, and reading progress.
        </p>
      </header>

      {error ? <Toast message={error} type="error" onDismiss={() => setError(null)} /> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {widgets.map((widget) => (
          <article
            key={widget.label}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-xs font-semibold uppercase text-slate-400">{widget.label}</p>
            <div className="mt-3 flex items-end justify-between">
              <span className="text-3xl font-bold text-slate-900">
                {loading ? <span className="text-base text-slate-400">...</span> : widget.value}
              </span>
              <Link href={widget.href} className="text-sm font-medium text-blue-600 hover:text-blue-700">
                {widget.actionLabel}
              </Link>
            </div>
          </article>
        ))}
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        {visibleQuickActions.length ? (
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <header>
              <h2 className="text-lg font-semibold text-slate-800">Quick actions</h2>
              <p className="text-xs text-slate-500">Jump straight into the tools you use most.</p>
            </header>
            <div className="grid gap-3 sm:grid-cols-2">
              {visibleQuickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 transition hover:border-blue-200 hover:text-blue-600"
                >
                  {action.label}
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">Next steps</h2>
          <ul className="space-y-2 text-sm text-slate-600">
            {nextSteps.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>
    </section>
  );
};

export default DashboardPage;
