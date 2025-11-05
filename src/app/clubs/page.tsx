'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Input from '@/components/Form/Input';
import Toast from '@/components/Toast';
import { useAuthStore } from '@/stores/authStore';
import {
  getReadingClubs,
  joinReadingClub,
  updateReadingClub,
  deleteReadingClub,
} from '@/services/readingClubService';

type ClubMember = {
  id?: string | number;
  name?: string;
};

type Club = {
  id?: string | number;
  name?: string;
  description?: string;
  currentBook?: { id?: string | number; title?: string };
  book?: string;
  members?: (ClubMember | string | number)[];
  ownerId?: string | number;
};

const ClubsPage = () => {
  const user = useAuthStore((state) => state.user);
  const role = user?.role ?? 'reader';
  const [clubs, setClubs] = useState<Club[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [processingClubId, setProcessingClubId] = useState<string | number | null>(null);

  useEffect(() => {
    let active = true;

    const loadClubs = async () => {
      setLoading(true);
      setError(null);
      try {
        const list = await getReadingClubs();
        if (!active) return;
        const normalized = Array.isArray(list) ? list : list ? [list] : [];
        setClubs(normalized);
      } catch (err) {
        console.error('Unable to load clubs', err);
        if (!active) return;
        setError('Unable to load clubs. Please try again.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadClubs();

    return () => {
      active = false;
    };
  }, []);

  const isMember = (club: Club) => {
    if (!user?.id) return false;
    if (Array.isArray(club.members)) {
      return club.members.some((member) => {
        if (typeof member === 'object') {
          return member?.id?.toString() === user.id?.toString();
        }
        return String(member) === String(user.id);
      });
    }
    return false;
  };

  const filteredClubs = useMemo(() => {
    return clubs.filter((club) => {
      const content = `${club.name ?? ''} ${club.description ?? ''} ${club.currentBook?.title ?? ''}`.toLowerCase();
      return content.includes(searchTerm.toLowerCase());
    });
  }, [clubs, searchTerm]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  const handleJoin = async (club: Club) => {
    if (!user?.id || !club.id) return;
    setProcessingClubId(club.id);
    setActionMessage(null);
    try {
      await joinReadingClub(club.id, user.id);
      setClubs((prev) =>
        prev.map((item) =>
          item.id === club.id
            ? {
                ...item,
                members: [
                  ...(Array.isArray(item.members) ? item.members : []),
                  { id: user.id, name: user.name },
                ] as (ClubMember | string | number)[],
              }
            : item,
        ),
      );
      setActionMessage('Joined club successfully.');
    } catch (err) {
      console.error('Join failed', err);
      setError('Unable to join this club right now.');
    } finally {
      setProcessingClubId(null);
    }
  };

  const handleLeave = async (club: Club) => {
    if (!user?.id || !club.id) return;
    setProcessingClubId(club.id);
    setActionMessage(null);
    try {
      await updateReadingClub(club.id, {
        action: 'leave',
        userId: user.id,
      }); // TODO: adjust payload to match API
      setClubs((prev) =>
        prev.map((item) =>
          item.id === club.id
            ? {
                ...item,
                members: (Array.isArray(item.members) ? item.members : []).filter((member) => {
                  if (typeof member === 'object' && member !== null && 'id' in member) {
                    return member.id?.toString() !== user.id?.toString();
                  }
                  return String(member) !== String(user.id);
                }) as (ClubMember | string | number)[],
              }
            : item,
        ),
      );
      setActionMessage('Left club successfully.');
    } catch (err) {
      console.error('Leave failed', err);
      setError('Unable to leave this club right now.');
    } finally {
      setProcessingClubId(null);
    }
  };

  const handleDelete = async (club: Club) => {
    if (!club.id) return;
    setProcessingClubId(club.id);
    setActionMessage(null);
    try {
      await deleteReadingClub(club.id);
      setClubs((prev) => prev.filter((item) => item.id !== club.id));
      setActionMessage('Club deleted.');
    } catch (err) {
      console.error('Delete failed', err);
      setError('Unable to delete this club right now.');
    } finally {
      setProcessingClubId(null);
    }
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Reading clubs</h1>
          <p className="text-sm text-slate-500">Discover reading circles, join discussions, and manage your groups.</p>
        </div>
        {(role === 'admin' || role === 'moderator') && (
          <Link
            href="/clubs/new"
            className="inline-flex h-11 items-center rounded-md bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Create club
          </Link>
        )}
      </header>

      <form onSubmit={handleSearch} className="rounded-lg border border-slate-200 bg-white p-4">
        <Input
          label="Search clubs"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Filter by name, description, or current book"
        />
      </form>

      {error ? <Toast message={error} type="error" onDismiss={() => setError(null)} /> : null}
      {actionMessage ? <Toast message={actionMessage} type="success" onDismiss={() => setActionMessage(null)} /> : null}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-40 animate-pulse rounded-lg bg-slate-200" />
          ))}
        </div>
      ) : filteredClubs.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredClubs.map((club) => {
            const member = isMember(club);
            const memberCount = Array.isArray(club.members) ? club.members.length : 0;
            return (
              <article
                key={club.id?.toString() ?? club.name ?? ''}
                className="flex h-full flex-col justify-between rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">{club.name ?? 'Untitled club'}</h2>
                      <p className="text-xs text-slate-500">
                        Members: {memberCount} | Current book:{' '}
                        {club.currentBook?.title ?? club.book ?? 'To be announced'}
                      </p>
                    </div>
                    <Link
                      href={`/clubs/${club.id ?? ''}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      View
                    </Link>
                  </div>
                  <p className="text-sm text-slate-600">{club.description ?? 'No description yet.'}</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {member ? (
                    <button
                      type="button"
                      onClick={() => handleLeave(club)}
                      className="rounded-md border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={processingClubId === club.id}
                    >
                      {processingClubId === club.id ? 'Leaving...��' : 'Leave'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleJoin(club)}
                      className="rounded-md bg-blue-600 px-3 py-1 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                      disabled={processingClubId === club.id}
                    >
                      {processingClubId === club.id ? 'Joining...��' : 'Join'}
                    </button>
                  )}
                  {(role === 'admin' || String(club.ownerId) === String(user?.id)) && (
                    <>
                      <Link
                        href={`/clubs/${club.id ?? ''}`}
                        className="rounded-md border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-800"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(club)}
                        className="rounded-md border border-rose-200 px-3 py-1 text-sm font-semibold text-rose-600 transition hover:border-rose-300 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={processingClubId === club.id}
                      >
                        {processingClubId === club.id ? 'Removing...��' : 'Delete'}
                      </button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
          <h2 className="text-lg font-semibold text-slate-800">No clubs yet</h2>
          <p className="mt-2 text-sm text-slate-500">
            Join or create a club to start collaborative reading sessions.
          </p>
          {(role === 'admin' || role === 'moderator') && (
            <Link
              href="/clubs/new"
              className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Create a club
            </Link>
          )}
        </div>
      )}
    </section>
  );
};

export default ClubsPage;
