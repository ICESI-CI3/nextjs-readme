'use client';

import { FormEvent, useEffect, useState } from 'react';
import { notFound, useParams } from 'next/navigation';
import Input from '@/components/Form/Input';
import Textarea from '@/components/Form/Textarea';
import Select from '@/components/Form/Select';
import Toast from '@/components/Toast';
import {
  addDebateMessage,
  getReadingClubById,
  joinReadingClub,
  startDebate,
  updateReadingClub,
} from '@/services/readingClubService';
import { useAuthStore } from '@/stores/authStore';

type ClubMember = {
  id?: string | number;
  name?: string;
  email?: string;
};

type DebateMessage = {
  id?: string | number;
  author?: ClubMember | string;
  message?: string;
  createdAt?: string;
};

type Debate = {
  id?: string | number;
  topic?: string;
  messages?: DebateMessage[];
};

type Club = {
  id?: string | number;
  name?: string;
  description?: string;
  currentBook?: { title?: string; author?: string };
  book?: string;
  members?: ClubMember[] | (string | number)[];
  meetingCadence?: string;
  ownerId?: string | number;
  debates?: Debate[];
};

const meetingOptions = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'as-needed', label: 'As needed' },
];

const ClubDetailPage = () => {
  const params = useParams<{ id: string }>();
  const user = useAuthStore((state) => state.user);
  const role = user?.role ?? 'reader';
  const [club, setClub] = useState<Club | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    meetingCadence: 'weekly',
    currentBook: '',
  });
  const [discussion, setDiscussion] = useState({ topic: '', message: '' });
  const [replyMessage, setReplyMessage] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const clubId = params?.id ? decodeURIComponent(params.id) : null;

  useEffect(() => {
    if (!clubId) {
      notFound();
      return;
    }

    let active = true;

    const loadClub = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getReadingClubById(clubId);
        if (!active) return;
        if (!data) {
          notFound();
          return;
        }
        setClub(data);
        setForm({
          name: data.name ?? '',
          description: data.description ?? '',
          meetingCadence: data.meetingCadence ?? 'weekly',
          currentBook: data.currentBook?.title ?? data.book ?? '',
        });
        if (data.debates?.[0]) {
          setDiscussion((prev) => ({
            ...prev,
            topic: data.debates?.[0]?.topic ?? prev.topic,
          }));
        }
      } catch (err) {
        console.error('Unable to load club', err);
        if (!active) return;
        setError('Unable to load this club. It may have been removed.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadClub();
    return () => {
      active = false;
    };
  }, [clubId]);

  const isAuthorized = role === 'admin' || String(club?.ownerId ?? '') === String(user?.id ?? '');

  const isMember = () => {
    if (!user?.id || !club?.members) return false;
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

  const updateField = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateDiscussionField = (key: keyof typeof discussion, value: string) => {
    setDiscussion((prev) => ({ ...prev, [key]: value }));
  };

  const handleDiscussionSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!club?.id || !user?.id) return;
    if (!isMember()) {
      setError('Join the club to start a discussion.');
      return;
    }
    const topic = discussion.topic.trim();
    const message = discussion.message.trim();
    if (!topic || !message) {
      setError('Please provide a topic and a message to start the discussion.');
      return;
    }
    setProcessing(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await startDebate(club.id, {
        topic,
        message,
      });
      const created = Array.isArray(response) ? response[0] : response?.debate ?? response ?? null;
      setClub((prev) =>
        prev
          ? {
              ...prev,
              debates: created ? [created, ...(prev.debates ?? [])] : prev.debates ?? [],
            }
          : prev,
      );
      setDiscussion({ topic: '', message: '' });
      setSuccess('Discussion created.');
    } catch (err) {
      console.error('Unable to start debate', err);
      setError('Unable to start a discussion right now.');
    } finally {
      setProcessing(false);
    }
  };

  const handleReplySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!club?.id || !user?.id) return;
    if (!isMember()) {
      setError('Join the club to participate in the discussion.');
      return;
    }
    const activeDebate = club.debates?.[0];
    if (!activeDebate?.id) {
      setError('There is no active discussion to reply to yet.');
      return;
    }
    const message = replyMessage.trim();
    if (!message) {
      setError('Write a message before posting.');
      return;
    }
    setReplySubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await addDebateMessage(activeDebate.id, { message });
      const created = Array.isArray(response) ? response[0] : response?.message ?? response ?? null;
      setClub((prev) =>
        prev
          ? {
              ...prev,
              debates: (prev.debates ?? []).map((debate) =>
                debate.id === activeDebate.id
                  ? {
                      ...debate,
                      messages: [
                        ...(debate.messages ?? []),
                        created ?? {
                          id: `local-${Date.now()}`,
                          message,
                          author: user,
                          createdAt: new Date().toISOString(),
                        },
                      ],
                    }
                  : debate,
              ),
            }
          : prev,
      );
      setReplyMessage('');
      setSuccess('Message posted.');
    } catch (err) {
      console.error('Unable to post message', err);
      setError('Unable to post your message right now.');
    } finally {
      setReplySubmitting(false);
    }
  };

  const handleJoin = async () => {
    if (!club?.id || !user?.id) return;
    setProcessing(true);
    setError(null);
    try {
      await joinReadingClub(club.id, user.id);
      setClub((prev) =>
        prev
          ? {
              ...prev,
              members: [
                ...(Array.isArray(prev.members) ? prev.members : []),
                { id: user.id, name: user.name },
              ],
            }
          : prev,
      );
      setSuccess('Joined the club.');
    } catch (err) {
      console.error('Join failed', err);
      setError('Unable to join this club right now.');
    } finally {
      setProcessing(false);
    }
  };

  const handleLeave = async () => {
    if (!club?.id || !user?.id) return;
    setProcessing(true);
    setError(null);
    try {
      await updateReadingClub(club.id, {
        action: 'leave',
        userId: user.id,
      }); // TODO: adjust payload to match API
      setClub((prev) =>
        prev
          ? {
              ...prev,
              members: (Array.isArray(prev.members) ? prev.members : []).filter((member) => {
                if (typeof member === 'object') {
                  return member?.id?.toString() !== user.id?.toString();
                }
                return String(member) !== String(user.id);
              }),
            }
          : prev,
      );
      setSuccess('Left the club.');
    } catch (err) {
      console.error('Leave failed', err);
      setError('Unable to leave this club right now.');
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!club?.id) return;
    setProcessing(true);
    setError(null);
    setSuccess(null);
    try {
      await updateReadingClub(club.id, {
        name: form.name,
        description: form.description,
        meetingCadence: form.meetingCadence,
        currentBook: form.currentBook,
      });
      setClub((prev) =>
        prev
          ? {
              ...prev,
              name: form.name,
              description: form.description,
              meetingCadence: form.meetingCadence,
              currentBook: {
                ...(prev.currentBook ?? {}),
                title: form.currentBook,
              },
              book: form.currentBook,
            }
          : prev,
      );
      setSuccess('Club details updated.');
      setEditing(false);
    } catch (err) {
      console.error('Update failed', err);
      setError('Unable to update this club right now.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDiscussionSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!club?.id) return;
    if (!discussion.topic.trim() || !discussion.message.trim()) {
      setError('Provide both a topic and a message to start the discussion.');
      return;
    }
    setProcessing(true);
    setError(null);
    try {
      if (club.debates?.[0]?.id) {
        const debateId = club.debates[0].id;
        await addDebateMessage(debateId, {
          message: discussion.message,
          authorId: user?.id,
        });
        setClub((prev) =>
          prev
            ? {
                ...prev,
                debates: prev.debates?.map((debate) =>
                  debate.id === debateId
                    ? {
                        ...debate,
                        messages: [
                          ...(debate.messages ?? []),
                          {
                            id: Math.random().toString(36).slice(2),
                            message: discussion.message,
                            author: { id: user?.id, name: user?.name },
                            createdAt: new Date().toISOString(),
                          },
                        ],
                      }
                    : debate,
                ),
              }
            : prev,
        );
      } else {
        const response = await startDebate(club.id, {
          topic: discussion.topic,
          message: discussion.message,
        });
        setClub((prev) =>
          prev
            ? {
                ...prev,
                debates: [
                  {
                    id: response?.id ?? Math.random().toString(36).slice(2),
                    topic: discussion.topic,
                    messages: [
                      {
                        id: Math.random().toString(36).slice(2),
                        message: discussion.message,
                        author: { id: user?.id, name: user?.name },
                        createdAt: new Date().toISOString(),
                      },
                    ],
                  },
                ],
              }
            : prev,
        );
      }
      setDiscussion((prev) => ({ ...prev, message: '' }));
      setSuccess('Posted to the discussion.');
    } catch (err) {
      console.error('Discussion update failed', err);
      setError('Unable to post to the discussion right now.');
    } finally {
      setProcessing(false);
    }
  };

  if (!clubId) return null;

  const member = isMember();

  return (
    <section className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{club?.name ?? 'Reading club'}</h1>
          <p className="text-sm text-slate-500">Coordinate sessions, track members, and keep the conversation going.</p>
        </div>
        <div className="flex gap-2">
          {isMember() ? (
            <button
              type="button"
              onClick={handleLeave}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={processing}
            >
              {processing ? 'Processing…' : 'Leave club'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleJoin}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              disabled={processing}
            >
              {processing ? 'Processing…' : 'Join club'}
            </button>
          )}
          {isAuthorized ? (
            <button
              type="button"
              onClick={() => setEditing((prev) => !prev)}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-800"
              disabled={processing}
            >
              {editing ? 'Cancel editing' : 'Edit club'}
            </button>
          ) : null}
        </div>
      </header>

      {error ? <Toast message={error} type="error" onDismiss={() => setError(null)} /> : null}
      {success ? <Toast message={success} type="success" onDismiss={() => setSuccess(null)} /> : null}

      {loading ? (
        <div className="space-y-3">
          <div className="h-24 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-32 animate-pulse rounded-lg bg-slate-200" />
        </div>
      ) : club ? (
        <div className="space-y-4">
          <article className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-[2fr,1fr]">
            <div className="space-y-3 text-sm text-slate-600">
              <h2 className="text-lg font-semibold text-slate-800">About this club</h2>
              <p>{club.description ?? 'No description provided yet.'}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Current book</p>
                  <p className="text-sm text-slate-700">
                    {club.currentBook?.title ?? club.book ?? 'To be announced'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Meeting cadence</p>
                  <p className="text-sm text-slate-700">{club.meetingCadence ?? 'Not set'}</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Members</h2>
              <ul className="space-y-1 text-sm text-slate-600">
                {Array.isArray(club.members) && club.members.length ? (
                  club.members.map((member, index) => {
                    if (typeof member === 'object') {
                      return (
                        <li key={(member.id ?? index).toString()} className="rounded-md bg-slate-100 px-3 py-2">
                          {member.name ?? member.email ?? `Member #${member.id ?? index}`}
                        </li>
                      );
                    }
                    return (
                      <li key={index} className="rounded-md bg-slate-100 px-3 py-2">
                        Member #{member}
                      </li>
                    );
                  })
                ) : (
                  <li className="rounded-md bg-slate-50 px-3 py-2 text-slate-400">No members listed.</li>
                )}
              </ul>
            </div>
          </article>

          {editing && isAuthorized ? (
            <form
              onSubmit={handleUpdate}
              className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
            >
              <Input
                label="Club name"
                value={form.name}
                onChange={(event) => updateField('name', event.target.value)}
                required
              />
              <Textarea
                label="Description"
                value={form.description}
                onChange={(event) => updateField('description', event.target.value)}
                required
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  label="Meeting cadence"
                  value={form.meetingCadence}
                  onChange={(event) => updateField('meetingCadence', event.target.value)}
                  options={meetingOptions}
                />
                <Input
                  label="Current book"
                  value={form.currentBook}
                  onChange={(event) => updateField('currentBook', event.target.value)}
                  placeholder="Title being read right now"
                />
              </div>
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
                  disabled={processing}
                >
                  {processing ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          ) : null}

          <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <header className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Discussion starter</h2>
                <p className="text-xs text-slate-500">
                  Share updates or prompts to keep members engaged.
                </p>
              </div>
            </header>
            <form onSubmit={handleDiscussionSubmit} className="space-y-3">
              <Input
                label="Topic"
                value={discussion.topic}
                onChange={(event) => updateDiscussionField('topic', event.target.value)}
                required
                placeholder="Weekly check-in"
              />
              <Textarea
                label="Message"
                value={discussion.message}
                onChange={(event) => updateDiscussionField('message', event.target.value)}
                placeholder="Share highlights or questions with the group."
                required
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                  disabled={processing}
                >
                  {processing ? 'Posting...' : 'Share update'}
                </button>
              </div>
            </form>
            {club.debates?.length ? (
              <div className="space-y-4 rounded-md bg-slate-50 p-4">
                <header className="space-y-1">
                  <h3 className="text-sm font-semibold text-slate-700">{club.debates[0].topic}</h3>
                  <p className="text-xs text-slate-500">Latest messages from the club.</p>
                </header>
                <ul className="space-y-2 text-sm text-slate-600">
                  {(club.debates[0].messages ?? []).map((message, index) => (
                    <li key={(message.id ?? index).toString()} className="rounded-md bg-white p-3 shadow-sm">
                      <p>{message.message}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {typeof message.author === 'object'
                          ? message.author?.name ?? message.author?.email ?? 'Member'
                          : message.author ?? 'Member'}
                        {message.createdAt ? ` - ${new Date(message.createdAt).toLocaleString()}` : ''}
                      </p>
                    </li>
                  ))}
                </ul>
                {member ? (
                  <form onSubmit={handleReplySubmit} className="space-y-3">
                    <Textarea
                      label="Reply"
                      value={replyMessage}
                      onChange={(event) => setReplyMessage(event.target.value)}
                      placeholder="Share your thoughts with the club."
                      required
                      disabled={replySubmitting}
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                        disabled={replySubmitting}
                      >
                        {replySubmitting ? 'Posting...' : 'Reply'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <p className="text-xs text-slate-400">Join the club to share your thoughts.</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No discussion yet. Start one above.</p>
            )}
          </section>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          Club not found.
        </div>
      )}
    </section>
  );
};

export default ClubDetailPage;
