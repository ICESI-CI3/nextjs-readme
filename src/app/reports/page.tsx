'use client';

import { useEffect, useMemo, useState } from 'react';
import Toast from '@/components/Toast';
import BarChart from '@/components/Charts/Bar';
import LineChart from '@/components/Charts/Line';
import { useAuthStore } from '@/stores/authStore';
import { getReadingStatesByUser, getAllReadingStates } from '@/services/readingStateService';
import { getAllBooks } from '@/services/bookService';
import { getReviews } from '@/services/reviewService';
import { getReadingClubs } from '@/services/readingClubService';

type ReadingState = {
  id?: string | number;
  status?: string;
  updatedAt?: string;
  createdAt?: string;
};

type Review = {
  id?: string | number;
  book?: { title?: string; id?: string | number };
  bookId?: string | number;
};

type Book = {
  id?: string | number;
  title?: string;
  status?: string;
};

type Club = {
  id?: string | number;
  name?: string;
  members?: Array<{ id?: string | number }> | (string | number)[];
  debates?: Array<{ messages?: Array<unknown> }>;
};

type ProgressRow = {
  month: string;
  reading: number;
  completed: number;
};

const tabs = [
  { id: 'progress', label: 'My Progress' },
  { id: 'books', label: 'Top Books' },
  { id: 'clubs', label: 'Club Activity' },
];

const monthFormatter = new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' });

const extractMonthKey = (dateString?: string) => {
  if (!dateString) return 'Unknown';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return monthFormatter.format(date);
};

const ReportsPage = () => {
  const user = useAuthStore((state) => state.user);
  const [activeTab, setActiveTab] = useState<'progress' | 'books' | 'clubs'>('progress');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progressRows, setProgressRows] = useState<ProgressRow[]>([]);
  const [topBooks, setTopBooks] = useState<{ title: string; reviews: number }[]>([]);
  const [clubActivity, setClubActivity] = useState<
    { name: string; members: number; posts: number; score: number }[]
  >([]);

  useEffect(() => {
    let active = true;

    const loadReports = async () => {
      setLoading(true);
      setError(null);
      try {
        const [readingStates, books, reviews, clubs] = await Promise.all([
          user?.id ? getReadingStatesByUser(user.id) : getAllReadingStates(),
          getAllBooks(),
          getReviews(),
          getReadingClubs(),
        ]);

        if (!active) return;

        const statesArray: ReadingState[] = Array.isArray(readingStates)
          ? readingStates
          : readingStates
            ? [readingStates]
            : [];

        const monthMap = new Map<string, { reading: number; completed: number }>();
        statesArray.forEach((entry) => {
          const key = extractMonthKey(entry.updatedAt ?? entry.createdAt);
          const bucket = monthMap.get(key) ?? { reading: 0, completed: 0 };
          if (entry.status === 'read' || entry.status === 'completed') {
            bucket.completed += 1;
          } else {
            bucket.reading += 1;
          }
          monthMap.set(key, bucket);
        });

        const sortedMonthKeys = Array.from(monthMap.keys()).sort((a, b) => {
          if (a === 'Unknown') return 1;
          if (b === 'Unknown') return -1;
          return new Date(a).getTime() - new Date(b).getTime();
        });

        setProgressRows(
          sortedMonthKeys.map((key) => ({
            month: key,
            reading: monthMap.get(key)?.reading ?? 0,
            completed: monthMap.get(key)?.completed ?? 0,
          })),
        );

        const reviewArray: Review[] = Array.isArray(reviews) ? reviews : reviews ? [reviews] : [];
        const bookCounts = new Map<string, number>();
        reviewArray.forEach((review) => {
          const title = review.book?.title ?? `Book #${review.bookId ?? 'Unknown'}`;
          bookCounts.set(title, (bookCounts.get(title) ?? 0) + 1);
        });

        if (!bookCounts.size) {
          const booksArray: Book[] = Array.isArray(books) ? books : books ? [books] : [];
          booksArray.forEach((book) => {
            const title = book.title ?? `Book #${book.id ?? 'Unknown'}`;
            if (book.status === 'read') {
              bookCounts.set(title, (bookCounts.get(title) ?? 0) + 1);
            }
          });
        }

        const topBooksData = Array.from(bookCounts.entries())
          .map(([title, reviewsCount]) => ({ title, reviews: reviewsCount }))
          .sort((a, b) => b.reviews - a.reviews)
          .slice(0, 5);

        setTopBooks(topBooksData);

        const clubsArray: Club[] = Array.isArray(clubs) ? clubs : clubs ? [clubs] : [];
        const clubActivityData = clubsArray.map((club) => {
          const members = Array.isArray(club.members) ? club.members.length : 0;
          const posts = club.debates?.reduce((total, debate) => total + (debate.messages?.length ?? 0), 0) ?? 0;
          return {
            name: club.name ?? `Club #${club.id ?? 'Unknown'}`,
            members,
            posts,
            score: members * 2 + posts,
          };
        });

        setClubActivity(clubActivityData.sort((a, b) => b.score - a.score));
      } catch (err) {
        console.error('Failed to load reports', err);
        if (!active) return;
        setError('Unable to load reports. Please try again.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadReports();
    return () => {
      active = false;
    };
  }, [user?.id]);

  const chartData = useMemo(() => {
    if (activeTab === 'progress') {
      return progressRows.map((row) => ({
        label: row.month,
        value: row.completed,
      }));
    }
    if (activeTab === 'books') {
      return topBooks.map((book) => ({
        label: book.title,
        value: book.reviews,
      }));
    }
    return clubActivity.map((club) => ({
      label: club.name,
      value: club.score,
    }));
  }, [activeTab, progressRows, topBooks, clubActivity]);

  const handleExportCsv = () => {
    let rows: string[][] = [];
    if (activeTab === 'progress') {
      rows = [['Month', 'Reading', 'Completed'], ...progressRows.map((row) => [row.month, `${row.reading}`, `${row.completed}`])];
    } else if (activeTab === 'books') {
      rows = [['Title', 'Reviews'], ...topBooks.map((book) => [book.title, `${book.reviews}`])];
    } else {
      rows = [['Club', 'Members', 'Posts', 'Score'], ...clubActivity.map((club) => [club.name, `${club.members}`, `${club.posts}`, `${club.score}`])];
    }

    const csvContent = rows.map((cells) => cells.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${activeTab}-report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const renderTable = () => {
    if (activeTab === 'progress') {
      return (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Month</th>
                <th className="px-4 py-3">Reading</th>
                <th className="px-4 py-3">Completed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-600">
              {progressRows.map((row) => (
                <tr key={row.month}>
                  <td className="px-4 py-3 font-medium text-slate-800">{row.month}</td>
                  <td className="px-4 py-3">{row.reading}</td>
                  <td className="px-4 py-3">{row.completed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (activeTab === 'books') {
      return (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Book</th>
                <th className="px-4 py-3">Reviews</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-600">
              {topBooks.map((book) => (
                <tr key={book.title}>
                  <td className="px-4 py-3 font-medium text-slate-800">{book.title}</td>
                  <td className="px-4 py-3">{book.reviews}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return (
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Club</th>
              <th className="px-4 py-3">Members</th>
              <th className="px-4 py-3">Posts</th>
              <th className="px-4 py-3">Activity score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-600">
            {clubActivity.map((club) => (
              <tr key={club.name}>
                <td className="px-4 py-3 font-medium text-slate-800">{club.name}</td>
                <td className="px-4 py-3">{club.members}</td>
                <td className="px-4 py-3">{club.posts}</td>
                <td className="px-4 py-3">{club.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>
        <p className="text-sm text-slate-500">
          Track your monthly progress, discover top-reviewed books, and monitor club engagement.
        </p>
      </header>

      {error ? <Toast message={error} type="error" onDismiss={() => setError(null)} /> : null}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex items-center gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={[
                'rounded-md px-3 py-2 text-sm font-semibold transition',
                activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-800"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Print
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-48 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-48 animate-pulse rounded-lg bg-slate-200" />
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            {activeTab === 'progress' ? <LineChart data={chartData} /> : <BarChart data={chartData} />}
          </div>
          {renderTable()}
        </>
      )}
    </section>
  );
};

export default ReportsPage;
