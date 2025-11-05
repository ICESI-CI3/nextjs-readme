'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Toast from '@/components/Toast';
import { useAuthStore } from '@/stores/authStore';
import { getAllBooks } from '@/services/bookService';
import { getReadingClubs } from '@/services/readingClubService';
import { getReviews } from '@/services/reviewService';
import { getAllReadingStates } from '@/services/readingStateService';
import {
  fetchMostReadBookReport,
  fetchMostCommentedBookReport,
  fetchTopReaderReport,
  MostReadBookReport,
  MostCommentedBookReport,
  TopReaderReport,
} from '@/services/reportsService';

type DashboardCounts = {
  books: number;
  clubs: number;
  reviews: number;
  readingStates: number;
};

type ReportsSummary = {
  mostRead: MostReadBookReport | null;
  mostCommented: MostCommentedBookReport | null;
  topReader: TopReaderReport | null;
};

const initialCounts: DashboardCounts = {
  books: 0,
  clubs: 0,
  reviews: 0,
  readingStates: 0,
};

const initialSummary: ReportsSummary = {
  mostRead: null,
  mostCommented: null,
  topReader: null,
};

const describeReportsError = (error: unknown) => {
  if (!error) return 'Unable to load reports summary. Please try again.';
  if (typeof error === 'string') return error;
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object') {
    const response = (error as { response?: { data?: unknown } }).response;
    if (response?.data) {
      if (typeof response.data === 'string') return response.data;
      if (
        typeof response.data === 'object' &&
        response.data !== null &&
        'message' in response.data &&
        typeof (response.data as { message?: unknown }).message === 'string'
      ) {
        return String((response.data as { message: string }).message);
      }
    }
  }
  return 'Unable to load reports summary. Please try again.';
};

const formatCount = (value: number, singular: string, plural?: string) =>
  `${value} ${value === 1 ? singular : plural ?? `${singular}s`}`;

const DashboardPage = () => {
  const user = useAuthStore((state) => state.user);
  const role = user?.role ?? 'reader';
  const normalizedRole = role.toString().toLowerCase();
  const isAdmin = normalizedRole === 'admin';

  const [counts, setCounts] = useState<DashboardCounts>(initialCounts);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportsSummary, setReportsSummary] = useState<ReportsSummary>(initialSummary);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);

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

  const refreshReportsSummary = useCallback(async () => {
    if (!isAdmin) {
      setReportsSummary(initialSummary);
      setReportsError(null);
      setReportsLoading(false);
      return;
    }

    setReportsLoading(true);
    setReportsError(null);
    try {
      const [mostRead, mostCommented, topReader] = await Promise.all([
        fetchMostReadBookReport(),
        fetchMostCommentedBookReport(),
        fetchTopReaderReport(),
      ]);

      setReportsSummary({
        mostRead,
        mostCommented,
        topReader,
      });
    } catch (err) {
      console.error('Failed to load reports summary', err);
      setReportsError(describeReportsError(err));
    } finally {
      setReportsLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    void refreshReportsSummary();
  }, [refreshReportsSummary]);

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

  const metricsCards = useMemo(
    () => [
      {
        id: 'most-read',
        title: 'Most read book',
        value: reportsSummary.mostRead?.title ?? (reportsLoading ? 'Loading…' : 'No data yet'),
        detail: reportsSummary.mostRead
          ? formatCount(reportsSummary.mostRead.reads, 'completion')
          : 'Waiting for readers to finish books.',
      },
      {
        id: 'most-commented',
        title: 'Most commented book',
        value: reportsSummary.mostCommented?.title ?? (reportsLoading ? 'Loading…' : 'No data yet'),
        detail: reportsSummary.mostCommented
          ? formatCount(reportsSummary.mostCommented.comments, 'comment')
          : 'Collect reviews to highlight community favorites.',
      },
      {
        id: 'top-reader',
        title: 'Top reader',
        value: reportsSummary.topReader?.username ?? (reportsLoading ? 'Loading…' : 'No data yet'),
        detail: reportsSummary.topReader
          ? formatCount(reportsSummary.topReader.booksRead, 'book finished', 'books finished')
          : 'Encourage readers to complete more books.',
      },
    ],
    [reportsSummary, reportsLoading],
  );

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

      {isAdmin ? (
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Engagement insights</h2>
              <p className="text-xs text-slate-500">High-level highlights from the reports dashboard.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                void refreshReportsSummary();
              }}
              disabled={reportsLoading}
              className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                reportsLoading
                  ? 'cursor-not-allowed bg-slate-200 text-slate-400'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              Refresh metrics
            </button>
          </div>
          {reportsError ? (
            <Toast message={reportsError} type="error" onDismiss={() => setReportsError(null)} />
          ) : null}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {metricsCards.map((metric) => (
              <article key={metric.id} className="space-y-1 rounded-lg border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{metric.title}</p>
                <span className="text-lg font-semibold text-slate-900">{metric.value}</span>
                <p className="text-xs text-slate-500">{metric.detail}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

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
