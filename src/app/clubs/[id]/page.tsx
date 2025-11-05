"use client";

import { FormEvent, useEffect, useState, useMemo } from "react";
import { notFound, useParams } from "next/navigation";
import Input from "@/components/Form/Input";
import Textarea from "@/components/Form/Textarea";
import Select from "@/components/Form/Select";
import Toast from "@/components/Toast";
import {
  addDebateMessage,
  getReadingClubById,
  joinReadingClub,
  startDebate,
  updateReadingClub,
} from "@/services/readingClubService";
import { useAuthStore } from "@/stores/authStore";

type ClubMember = { id?: string | number; name?: string; email?: string };
type RawMembers = ClubMember[] | (string | number)[] | undefined;

const toMemberObj = (m: ClubMember | string | number): ClubMember =>
  typeof m === "object"
    ? { id: m.id, name: m.name, email: m.email }
    : { id: m };

const normalizeMembers = (list: RawMembers): ClubMember[] =>
  Array.isArray(list) ? (list.map(toMemberObj) as ClubMember[]) : [];

const extractBookTitle = (value: unknown): string => {
  if (!value) return "To be announced";
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : "To be announced";
  }
  if (typeof value === "object" && value !== null) {
    const candidate =
      "title" in value
        ? (value as { title?: unknown }).title
        : "name" in value
          ? (value as { name?: unknown }).name
          : undefined;
    if (typeof candidate === "string" && candidate.trim().length) {
      return candidate.trim();
    }
  }
  return "To be announced";
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
  currentBook?: { title?: string; author?: string } | null;
  book?: string | null;
  members?: ClubMember[] | (string | number)[]; // recibimos mixto del backend
  meetingCadence?: string;
  ownerId?: string | number;
  debates?: Debate[];
};

const meetingOptions = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
  { value: "as-needed", label: "As needed" },
];

export default function ClubDetailPage() {
  const params = useParams<{ id: string }>();
  const clubId = params?.id ? decodeURIComponent(params.id) : null;

  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? "reader";

  const [club, setClub] = useState<Club | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    meetingCadence: "weekly",
    currentBook: "",
  });
  const [discussion, setDiscussion] = useState({ topic: "", message: "" });
  const [replyMessage, setReplyMessage] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!clubId) {
      notFound();
      return;
    }
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getReadingClubById(clubId);
        if (!active) return;
        if (!data) return notFound();

        // Normalizamos members al guardar en estado
        setClub({
          ...data,
          members: normalizeMembers(data.members),
        });

        setForm({
          name: data.name ?? "",
          description: data.description ?? "",
          meetingCadence: data.meetingCadence ?? "weekly",
          currentBook: extractBookTitle(data.currentBook ?? data.book),
        });

        if (data.debates?.[0]) {
          setDiscussion((p) => ({
            ...p,
            topic: data.debates?.[0]?.topic ?? p.topic,
          }));
        }
      } catch (e) {
        console.error(e);
        if (!active) return;
        setError("Unable to load this club. It may have been removed.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [clubId]);

  const isAuthorized =
    role === "admin" || String(club?.ownerId ?? "") === String(user?.id ?? "");

  // Ya que guardamos normalizado, esto es simple:
  const member = useMemo(() => {
    if (!user?.id || !club?.members) return false;
    return normalizeMembers(club.members).some(
      (m) => String(m.id) === String(user.id)
    );
  }, [club?.members, user?.id]);

  const currentBookTitle = useMemo(
    () => extractBookTitle(club?.currentBook ?? club?.book),
    [club?.currentBook, club?.book]
  );

  const setField = (k: keyof typeof form, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));
  const setDisc = (k: keyof typeof discussion, v: string) =>
    setDiscussion((p) => ({ ...p, [k]: v }));

  const handleReplySubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!club?.id || !user?.id) return;
    if (!member)
      return setError("Join the club to participate in the discussion.");
    const activeDebate = club.debates?.[0];
    if (!activeDebate?.id)
      return setError("There is no active discussion to reply to yet.");
    const message = replyMessage.trim();
    if (!message) return setError("Write a message before posting.");

    setReplySubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const resp = await addDebateMessage(activeDebate.id, { message });
      const created = Array.isArray(resp)
        ? resp[0]
        : resp?.message ?? resp ?? null;

      setClub((prev) =>
        prev
          ? {
              ...prev,
              debates: (prev.debates ?? []).map((d) =>
                d.id === activeDebate.id
                  ? {
                      ...d,
                      messages: [
                        ...(d.messages ?? []),
                        created ?? {
                          id: `local-${Date.now()}`,
                          message,
                          author: user,
                          createdAt: new Date().toISOString(),
                        },
                      ],
                    }
                  : d
              ),
            }
          : prev
      );
      setReplyMessage("");
      setSuccess("Message posted.");
    } catch (e) {
      console.error(e);
      setError("Unable to post your message right now.");
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
              // Siempre agregamos un objeto ClubMember
              members: [
                ...normalizeMembers(prev.members),
                { id: user.id, name: user.name, email: user.email },
              ],
            }
          : prev
      );
      setSuccess("Joined the club.");
    } catch (e) {
      console.error(e);
      setError("Unable to join this club right now.");
    } finally {
      setProcessing(false);
    }
  };

  const handleLeave = () => {
    if (!club?.id || !user?.id) return;
    setProcessing(true);
    setError(null);
    setClub((prev) =>
      prev
        ? {
            ...prev,
            members: normalizeMembers(prev.members).filter(
              (m) => String(m.id) !== String(user.id)
            ),
          }
        : prev
    );
    setSuccess("Left the club.");
    setProcessing(false);
  };

  const handleUpdate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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
          : prev
      );
      setSuccess("Club details updated.");
      setEditing(false);
    } catch (e) {
      console.error(e);
      setError("Unable to update this club right now.");
    } finally {
      setProcessing(false);
    }
  };

  const handleDiscussionSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!club?.id || !user?.id) return;
    if (!member) return setError("Join the club to start a discussion.");
    if (!discussion.topic.trim() || !discussion.message.trim())
      return setError("Provide both a topic and a message.");

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
                debates: prev.debates?.map((d) =>
                  d.id === debateId
                    ? {
                        ...d,
                        messages: [
                          ...(d.messages ?? []),
                          {
                            id: Math.random().toString(36).slice(2),
                            message: discussion.message,
                            author: { id: user?.id, name: user?.name },
                            createdAt: new Date().toISOString(),
                          },
                        ],
                      }
                    : d
                ),
              }
            : prev
        );
      } else {
        const resp = await startDebate(club.id, {
          topic: discussion.topic,
          message: discussion.message,
        });
        setClub((prev) =>
          prev
            ? {
                ...prev,
                debates: [
                  {
                    id: resp?.id ?? Math.random().toString(36).slice(2),
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
            : prev
        );
      }
      setDiscussion((p) => ({ ...p, message: "" }));
      setSuccess("Posted to the discussion.");
    } catch (e) {
      console.error(e);
      setError("Unable to post to the discussion right now.");
    } finally {
      setProcessing(false);
    }
  };

  if (!clubId) return null;

  return (
    <section className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/70 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
            Club
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {club?.name ?? "Reading club"}
          </h1>
          <p className="text-sm text-slate-500">
            Coordinate sessions, track members, and keep the conversation going.
          </p>
        </div>
        <div className="flex gap-2">
          {member ? (
            <button
              type="button"
              onClick={handleLeave}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={processing}
            >
              {processing ? "Processing…" : "Leave club"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleJoin}
              className="rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={processing}
            >
              {processing ? "Processing…" : "Join club"}
            </button>
          )}
          {isAuthorized && (
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-800"
              disabled={processing}
            >
              {editing ? "Cancel editing" : "Edit club"}
            </button>
          )}
        </div>
      </header>

      {error && (
        <Toast message={error} type="error" onDismiss={() => setError(null)} />
      )}
      {success && (
        <Toast
          message={success}
          type="success"
          onDismiss={() => setSuccess(null)}
        />
      )}

      {loading ? (
        <div className="space-y-3">
          <div className="h-24 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-32 animate-pulse rounded-2xl bg-slate-200" />
        </div>
      ) : club ? (
        <div className="space-y-4">
          {/* about + members */}
          <article className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-[2fr,1fr]">
            <div className="space-y-3 text-sm text-slate-600">
              <h2 className="text-lg font-semibold text-slate-800">
                About this club
              </h2>
              <p>{club.description ?? "No description provided yet."}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Current book
                  </p>
                  <p className="text-sm text-slate-700">
                    {currentBookTitle}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Meeting cadence
                  </p>
                  <p className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-sm text-indigo-700">
                    {club.meetingCadence ?? "Not set"}
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Members
              </h2>
              <ul className="space-y-1 text-sm text-slate-600">
                {normalizeMembers(club.members).length ? (
                  normalizeMembers(club.members).map((m, i) => (
                    <li
                      key={(m.id ?? i).toString()}
                      className="rounded-md bg-slate-100 px-3 py-2"
                    >
                      {m.name ?? m.email ?? `Member #${m.id ?? i}`}
                    </li>
                  ))
                ) : (
                  <li className="rounded-md bg-slate-50 px-3 py-2 text-slate-400">
                    No members listed.
                  </li>
                )}
              </ul>
            </div>
          </article>

          {/* edit form */}
          {editing && isAuthorized && (
            <form
              onSubmit={handleUpdate}
              className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <Input
                label="Club name"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                required
              />
              <Textarea
                label="Description"
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                required
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  label="Meeting cadence"
                  value={form.meetingCadence}
                  onChange={(e) => setField("meetingCadence", e.target.value)}
                  options={meetingOptions}
                />
                <Input
                  label="Current book"
                  value={form.currentBook}
                  onChange={(e) => setField("currentBook", e.target.value)}
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
                  className="rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={processing}
                >
                  {processing ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          )}

          {/* discussion */}
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <header className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">
                  Discussion starter
                </h2>
                <p className="text-xs text-slate-500">
                  Share updates or prompts to keep members engaged.
                </p>
              </div>
            </header>

            <form onSubmit={handleDiscussionSubmit} className="space-y-3">
              <Input
                label="Topic"
                value={discussion.topic}
                onChange={(e) => setDisc("topic", e.target.value)}
                required
                placeholder="Weekly check-in"
              />
              <Textarea
                label="Message"
                value={discussion.message}
                onChange={(e) => setDisc("message", e.target.value)}
                placeholder="Share highlights or questions with the group."
                required
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={processing}
                >
                  {processing ? "Posting…" : "Share update"}
                </button>
              </div>
            </form>

            {club.debates?.length ? (
              <div className="space-y-4 rounded-md bg-slate-50 p-4">
                <header className="space-y-1">
                  <h3 className="text-sm font-semibold text-slate-700">
                    {club.debates[0].topic}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Latest messages from the club.
                  </p>
                </header>
                <ul className="space-y-2 text-sm text-slate-600">
                  {(club.debates[0].messages ?? []).map((m, i) => (
                    <li
                      key={(m.id ?? i).toString()}
                      className="rounded-md bg-white p-3 shadow-sm"
                    >
                      <p>{m.message}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {typeof m.author === "object"
                          ? m.author?.name ?? m.author?.email ?? "Member"
                          : m.author ?? "Member"}
                        {m.createdAt
                          ? ` — ${new Date(m.createdAt).toLocaleString()}`
                          : ""}
                      </p>
                    </li>
                  ))}
                </ul>

                {member ? (
                  <form onSubmit={handleReplySubmit} className="space-y-3">
                    <Textarea
                      label="Reply"
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
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
                        {replySubmitting ? "Posting…" : "Reply"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <p className="text-xs text-slate-400">
                    Join the club to share your thoughts.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                No discussion yet. Start one above.
              </p>
            )}
          </section>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          Club not found.
        </div>
      )}
    </section>
  );
}
