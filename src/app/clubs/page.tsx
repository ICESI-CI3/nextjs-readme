"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Input from "@/components/Form/Input";
import Toast from "@/components/Toast";
import { useAuthStore } from "@/stores/authStore";
import {
  getReadingClubs,
  joinReadingClub,
  deleteReadingClub,
} from "@/services/readingClubService";

type ClubMember = { id?: string | number; name?: string };
type BookObj = {
  id?: string | number;
  title?: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  categories?: string[];
  isbn?: string;
  cover?: string;
  createdAt?: string;
  updatedAt?: string;
};

type Club = {
  id?: string | number;
  name?: string;
  description?: string;
  currentBook?: { id?: string | number; title?: string } | null;
  book?: string | BookObj | null; // puede venir string o objeto
  members?: (ClubMember | string | number)[];
  ownerId?: string | number;
  meetingCadence?: string;
};

// ---------- Helpers ----------
const getBookTitle = (club: Pick<Club, "book" | "currentBook">) => {
  const fromCurrent =
    club.currentBook && club.currentBook.title ? club.currentBook.title : null;

  const fromBook =
    typeof club.book === "string"
      ? club.book
      : club.book && typeof club.book === "object"
      ? (club.book as BookObj).title
      : null;

  return fromCurrent ?? fromBook ?? "To be announced";
};

export default function ClubsPage() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? "reader";
  const [clubs, setClubs] = useState<Club[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | number | null>(null);

  const userId = user?.id ? String(user.id) : null;
  const canCreateClub = Boolean(userId);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const list = await getReadingClubs();
        if (!active) return;
        const normalized = Array.isArray(list) ? list : list ? [list] : [];
        setClubs(normalized);
      } catch (e) {
        console.error(e);
        if (!active) return;
        setError("Unable to load clubs. Please try again.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const isMember = (club: Club) => {
    if (!user?.id) return false;
    if (!Array.isArray(club.members)) return false;
    return club.members.some((m) =>
      typeof m === "object"
        ? String((m as ClubMember)?.id) === String(user.id)
        : String(m) === String(user.id)
    );
  };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return clubs;
    return clubs.filter((c) => {
      const txt = `${c.name ?? ""} ${c.description ?? ""} ${getBookTitle(
        c
      )}`.toLowerCase();
      return txt.includes(term);
    });
  }, [q, clubs]);

  const onSearch = (e: FormEvent<HTMLFormElement>) => e.preventDefault();

  const handleJoin = async (club: Club) => {
    if (!user?.id || !club.id) return;
    setBusyId(club.id);
    setFlash(null);
    try {
      await joinReadingClub(club.id, user.id);
      setClubs((prev) =>
        prev.map((it) =>
          it.id === club.id
            ? {
                ...it,
                members: [
                  ...(Array.isArray(it.members) ? it.members : []),
                  { id: user.id, name: user.name },
                ],
              }
            : it
        )
      );
      setFlash("Joined club successfully.");
    } catch (e) {
      console.error(e);
      setError("Unable to join this club right now.");
    } finally {
      setBusyId(null);
    }
  };

  const handleLeaveLocal = (club: Club) => {
    if (!club.id) return;
    setBusyId(club.id);
    setClubs((prev) =>
      prev.map((it) =>
        it.id === club.id
          ? {
              ...it,
              members: (Array.isArray(it.members) ? it.members : []).filter(
                (m) =>
                  typeof m === "object"
                    ? String((m as ClubMember).id) !== String(user?.id)
                    : String(m) !== String(user?.id)
              ),
            }
          : it
      )
    );
    setFlash("Left club successfully.");
    setBusyId(null);
  };

  const handleDelete = async (club: Club) => {
    if (!club.id) return;
    setBusyId(club.id);
    setFlash(null);
    try {
      await deleteReadingClub(club.id);
      setClubs((prev) => prev.filter((it) => it.id !== club.id));
      setFlash("Club deleted.");
    } catch (e) {
      console.error(e);
      setError("Unable to delete this club right now.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/70 px-3 py-1 text-xs font-semibold tracking-wide text-indigo-700">
            Clubs & debates
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Reading clubs
          </h1>
          <p className="text-sm text-slate-500">
            Discover circles, join discussions, and manage your groups.
          </p>
        </div>
        {canCreateClub && (
          <Link
            href="/clubs/new"
            className="inline-flex h-11 items-center rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:brightness-110"
          >
            Create club
          </Link>
        )}
      </header>

      <form
        onSubmit={onSearch}
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <Input
          label="Search clubs"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter by name, description, or current book"
        />
      </form>

      {error && (
        <Toast message={error} type="error" onDismiss={() => setError(null)} />
      )}
      {flash && (
        <Toast
          message={flash}
          type="success"
          onDismiss={() => setFlash(null)}
        />
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-2xl bg-slate-200"
            />
          ))}
        </div>
      ) : filtered.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((club) => {
            const member = isMember(club);
            const members = Array.isArray(club.members) ? club.members : [];
            const count = members.length;
            const cadence = club.meetingCadence ?? "Not set";

            return (
              <article
                key={(club.id ?? club.name ?? Math.random()).toString()}
                className="flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">
                        {club.name ?? "Untitled club"}
                      </h2>
                      <p className="text-xs text-slate-500">
                        <span className="mr-2 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                          {count} member{count === 1 ? "" : "s"}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-700">
                          {cadence}
                        </span>
                      </p>
                    </div>
                    <Link
                      href={`/clubs/${club.id ?? ""}`}
                      className="text-sm font-semibold text-blue-700 hover:text-blue-800"
                    >
                      View
                    </Link>
                  </div>
                  <p className="line-clamp-2 text-sm text-slate-600">
                    {club.description ?? "No description yet."}
                  </p>
                  <p className="text-xs text-slate-500">
                    <span className="font-semibold text-slate-600">
                      Current book:
                    </span>{" "}
                    {getBookTitle(club)}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {member ? (
                    <button
                      type="button"
                      onClick={() => handleLeaveLocal(club)}
                      className="rounded-md border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={busyId === club.id}
                    >
                      {busyId === club.id ? "Leaving…" : "Leave"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleJoin(club)}
                      className="rounded-md bg-blue-600 px-3 py-1 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                      disabled={busyId === club.id}
                    >
                      {busyId === club.id ? "Joining…" : "Join"}
                    </button>
                  )}

                  {(role === "admin" ||
                    String(club.ownerId) === String(user?.id)) && (
                    <>
                      <Link
                        href={`/clubs/${club.id ?? ""}`}
                        className="rounded-md border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-800"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(club)}
                        className="rounded-md border border-rose-200 px-3 py-1 text-sm font-semibold text-rose-600 transition hover:border-rose-300 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={busyId === club.id}
                      >
                        {busyId === club.id ? "Removing…" : "Delete"}
                      </button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <h2 className="text-lg font-semibold text-slate-800">No clubs yet</h2>
          <p className="mt-2 text-sm text-slate-500">
            Join an existing club or start one to become its moderator.
          </p>
          {canCreateClub && (
            <Link
              href="/clubs/new"
              className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:brightness-110"
            >
              Create a club
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
