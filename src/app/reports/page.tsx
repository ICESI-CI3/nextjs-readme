'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Toast from '@/components/Toast';
import { useAuthStore } from '@/stores/authStore';
import {
  fetchUserStatsReport,
  fetchMostReadBookReport,
  fetchMostCommentedBookReport,
  fetchTopReaderReport,
  UserStatsReport,
  MostReadBookReport,
  MostCommentedBookReport,
  TopReaderReport,
} from '@/services/reportsService';

const describeError = (error: unknown) => {
  if (!error) return 'Unexpected error. Please try again.';
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

    if ('message' in error && typeof (error as { message?: unknown }).message === 'string') {
      return String((error as { message: string }).message);
    }
  }

  return 'Unexpected error. Please try again.';
};

const formatDateTime = (isoString: string) => {
  try {
    const formatter = new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    return formatter.format(new Date(isoString));
  } catch {
    return isoString;
  }
};

const formatCount = (value: number, singular: string, plural?: string) =>
  `${value} ${value === 1 ? singular : plural ?? `${singular}s`}`;

const skeletonRows = Array.from({ length: 4 });

const ReportsPage = () => {
  const initialized = useAuthStore((state) => state.initialized);
  const user = useAuthStore((state) => state.user);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userStats, setUserStats] = useState<UserStatsReport[]>([]);
  const [mostReadBook, setMostReadBook] = useState<MostReadBookReport | null>(null);
  const [mostCommentedBook, setMostCommentedBook] = useState<MostCommentedBookReport | null>(null);
  const [topReader, setTopReader] = useState<TopReaderReport | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const isAdmin = user?.role ? String(user.role).toLowerCase() === 'admin' : false;

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);

    const settled = (await Promise.allSettled([
      fetchUserStatsReport(),
      fetchMostReadBookReport(),
      fetchMostCommentedBookReport(),
      fetchTopReaderReport(),
    ])) as [
      PromiseSettledResult<UserStatsReport[]>,
      PromiseSettledResult<MostReadBookReport | null>,
      PromiseSettledResult<MostCommentedBookReport | null>,
      PromiseSettledResult<TopReaderReport | null>,
    ];

    const [statsResult, mostReadResult, mostCommentedResult, topReaderResult] = settled;

    const issues: string[] = [];
    let hadSuccess = false;

    if (statsResult.status === 'fulfilled') {
      hadSuccess = true;
      const sortedStats = [...statsResult.value].sort((a, b) => {
        if (b.booksRead !== a.booksRead) return b.booksRead - a.booksRead;
        return b.reviewsCount - a.reviewsCount;
      });
      setUserStats(sortedStats);
    } else {
      issues.push(describeError(statsResult.reason));
    }

    if (mostReadResult.status === 'fulfilled') {
      hadSuccess = true;
      setMostReadBook(mostReadResult.value);
    } else {
      issues.push(describeError(mostReadResult.reason));
    }

    if (mostCommentedResult.status === 'fulfilled') {
      hadSuccess = true;
      setMostCommentedBook(mostCommentedResult.value);
    } else {
      issues.push(describeError(mostCommentedResult.reason));
    }

    if (topReaderResult.status === 'fulfilled') {
      hadSuccess = true;
      setTopReader(topReaderResult.value);
    } else {
      issues.push(describeError(topReaderResult.reason));
    }

    if (hadSuccess) {
      setLastUpdated(new Date().toISOString());
    }

    const uniqueIssues = Array.from(new Set(issues.filter(Boolean)));
    setError(uniqueIssues.length ? `Some metrics failed to load: ${uniqueIssues.join(' ')}` : null);

    setLoading(false);
  }, []);

  useEffect(() => {
    if (!initialized || !isAdmin) return;
    const timeoutId = window.setTimeout(() => {
      void loadReports();
    }, 0);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [initialized, isAdmin, loadReports]);

  const lastUpdatedLabel = useMemo(
    () => (lastUpdated ? formatDateTime(lastUpdated) : null),
    [lastUpdated],
  );

  if (initialized && !isAdmin) {
    return (
      <section className="space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>
          <p className="text-sm text-slate-500">
            This section is restricted to administrator accounts.
          </p>
        </header>
        <Toast
          type="warning"
          message="You need administrator permissions to view the reports dashboard."
        />
      </section>
    );
  }

  const metrics = [
    {
      id: 'most-read',
      title: 'Most read book',
      value: mostReadBook?.title ?? (loading ? 'Loading…' : 'No data yet'),
      detail: mostReadBook
        ? `${formatCount(mostReadBook.reads, 'completion')}`
        : 'Waiting for readers to finish books.',
    },
    {
      id: 'most-commented',
      title: 'Most commented book',
      value: mostCommentedBook?.title ?? (loading ? 'Loading…' : 'No data yet'),
      detail: mostCommentedBook
        ? `${formatCount(mostCommentedBook.comments, 'comment')}`
        : 'Collect reviews to see top discussions.',
    },
    {
      id: 'top-reader',
      title: 'Top reader',
      value: topReader?.username ?? (loading ? 'Loading…' : 'No data yet'),
      detail: topReader
        ? `${formatCount(topReader.booksRead, 'book finished', 'books finished')}`
        : 'Encourage readers to complete more books.',
    },
  ];

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>
        <p className="text-sm text-slate-500">
          Monitor activity across the platform to understand who is reading, reviewing, and engaging
          the most.
        </p>
      </header>

      {error ? <Toast message={error} type="error" onDismiss={() => setError(null)} /> : null}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wide text-slate-400">Last updated</span>
          <span className="text-sm font-medium text-slate-700">
            {lastUpdatedLabel ?? (loading ? 'Loading…' : 'Awaiting first refresh')}
          </span>
        </div>
        <button
          type="button"
          onClick={loadReports}
          disabled={loading}
          className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
            loading
              ? 'cursor-not-allowed bg-slate-200 text-slate-400'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          Refresh
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <article
            key={metric.id}
            className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {metric.title}
              </p>
              <span className="text-lg font-semibold text-slate-900">{metric.value}</span>
            </div>
            <p className="text-xs text-slate-500">{metric.detail}</p>
          </article>
        ))}
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">User statistics</h2>
          <p className="text-xs text-slate-500">
            Breakdown of reading progress and reviews per registered user.
          </p>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="space-y-2 p-6">
              {skeletonRows.map((_, index) => (
                <div key={index} className="h-10 animate-pulse rounded-md bg-slate-100" />
              ))}
            </div>
          ) : (
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Books finished</th>
                  <th className="px-4 py-3">Books pending</th>
                  <th className="px-4 py-3">Reviews written</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-600">
                {userStats.length ? (
                  userStats.map((stat) => (
                    <tr key={stat.id}>
                      <td className="px-4 py-3 font-medium text-slate-800">{stat.username}</td>
                      <td className="px-4 py-3">{stat.email}</td>
                      <td className="px-4 py-3">{stat.booksRead}</td>
                      <td className="px-4 py-3">{stat.booksToRead}</td>
                      <td className="px-4 py-3">{stat.reviewsCount}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-6 text-center text-sm text-slate-400"
                    >
                      No statistics available yet. Encourage your readers to engage with more books.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </section>
  );
};

export default ReportsPage;
