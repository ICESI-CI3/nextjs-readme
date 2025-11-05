// src/app/dashboard/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Toast from "@/components/Toast";
import { useAuthStore } from "@/stores/authStore";
import { getAllReadingStates } from "@/services/readingStateService";
import type { ReadingStateRecord } from "@/services/readingStateService";
import { getReviews } from "@/services/reviewService";
import type { ReviewRecord } from "@/services/reviewService";
import { getReadingClubs } from "@/services/readingClubService";
import type { ClubRecord } from "@/services/readingClubService";
import BooksGrid from "@/components/Books/BooksGrid";

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const uid = user?.id?.toString() ?? "";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [readingStates, setReadingStates] = useState<ReadingStateRecord[]>([]);
  const [myReviews, setMyReviews] = useState<ReviewRecord[]>([]);
  const [clubs, setClubs] = useState<ClubRecord[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setErr(null);
        setLoading(true);
        const [rs, rv, cl] = await Promise.all([
          getAllReadingStates(), // ideal: devuelve los del usuario actual
          getReviews(),
          getReadingClubs(),
        ]);
        if (!active) return;

        setReadingStates(Array.isArray(rs) ? rs : []);
        setMyReviews(Array.isArray(rv) ? rv : []);
        setClubs(Array.isArray(cl) ? cl : []);
      } catch (e) {
        console.error(e);
        if (!active) return;
        setErr("Unable to load your data. Please try again.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // si la API envía estados globales, filtramos si viene userId:
  const mine = useMemo(
    () =>
      readingStates.filter((r) => (r.userId ? String(r.userId) === uid : true)),
    [readingStates, uid]
  );

  const counts = useMemo(() => {
    const by = mine.reduce<{ pending: number; reading: number; read: number }>(
      (acc, r) => {
        const s = (r.state ?? "").toLowerCase();
        if (s === "pending" || s === "to-read") acc.pending++;
        else if (s === "reading") acc.reading++;
        else if (s === "read" || s === "completed") acc.read++;
        return acc;
      },
      { pending: 0, reading: 0, read: 0 }
    );
    return {
      entries: mine.length,
      ...by,
      reviews: myReviews.length,
      clubs: clubs.length,
    };
  }, [mine, myReviews, clubs]);

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">
          Welcome back{user?.name ? `, ${user.name}` : ""}.
        </h1>
        <p className="text-sm text-slate-500">
          Your latest activity across books, clubs and reading progress.
        </p>
      </header>

      {err ? (
        <Toast message={err} type="error" onDismiss={() => setErr(null)} />
      ) : null}

      {/* métricas personales */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "To read", value: counts.pending },
          { label: "Reading now", value: counts.reading },
          { label: "Finished", value: counts.read },
          { label: "My reviews", value: counts.reviews, href: "/reviews" },
        ].map((w) => (
          <article
            key={w.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase text-slate-400">
              {w.label}
            </p>
            <div className="mt-3 flex items-end justify-between">
              <span className="text-3xl font-bold text-slate-900">
                {loading ? (
                  <span className="text-base text-slate-400">…</span>
                ) : (
                  w.value
                )}
              </span>
              {w.href ? (
                <Link
                  href={w.href}
                  className="text-sm font-medium text-blue-700 hover:text-blue-800"
                >
                  Open
                </Link>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      {/* acciones rápidas */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <header>
            <h2 className="text-lg font-semibold text-slate-800">
              Quick actions
            </h2>
            <p className="text-xs text-slate-500">Jump into what matters.</p>
          </header>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/reading"
              className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 transition hover:border-blue-200 hover:text-blue-600"
            >
              Open reading log
            </Link>
            <Link
              href="/clubs"
              className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 transition hover:border-blue-200 hover:text-blue-600"
            >
              Find a club
            </Link>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">Next steps</h2>
          <ul className="space-y-2 text-sm text-slate-600">
            <li>Pick a book from your library to start reading.</li>
            <li>Join a club to discuss your current reads.</li>
            <li>Log a review when you finish a book.</li>
          </ul>
        </div>
      </section>

      {/* mi biblioteca (grid) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">My library</h2>
          <Link
            href="/books"
            className="text-sm font-semibold text-blue-700 hover:text-blue-800"
          >
            See all
          </Link>
        </div>
        <BooksGrid initialLimit={8} />
      </section>
    </section>
  );
}
