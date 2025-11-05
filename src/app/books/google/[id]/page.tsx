"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import Toast from "@/components/Toast";
import { useAuthStore } from "@/stores/authStore";
import { upsertReadingState } from "@/services/readingStateService"; // ✅ use the new upsert
import { getGoogleBookById } from "@/services/bookService"; // ✅ keep read-only fetch
import Select from "@/components/Form/Select";
import Textarea from "@/components/Form/Textarea";
import { GoogleVolume } from "@/lib/googleBooks";


// ... (types + helpers extractIsbn/extractCover stay the same)

const statusOptions = [
  { value: "to-read", label: "To read" },
  { value: "reading", label: "Reading" },
  { value: "completed", label: "Completed" },
];

const GoogleBookDetailPage = () => {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const user = useAuthStore((state) => state.user);

  const [volume, setVolume] = useState<GoogleVolume | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("reading");
  const [notes, setNotes] = useState<string>(""); // kept for future use

  const volumeId = params?.id ? decodeURIComponent(params.id) : null;

  useEffect(() => {
    if (!volumeId) {
      notFound();
      return;
    }

    let active = true;

    const loadVolume = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getGoogleBookById(volumeId);
        if (!active) return;
        if (!data) {
          notFound();
          return;
        }
        setVolume(data);
      } catch (err) {
        console.error("Unable to load Google Books title", err);
        if (!active) return;
        setError(
          "Unable to load this title from Google Books. It may be unavailable."
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    loadVolume();
    return () => {
      active = false;
    };
  }, [volumeId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!volumeId || !volume) return;
    if (!user) {
      router.push(
        `/login?redirectTo=${encodeURIComponent(`/books/google/${volumeId}`)}`
      );
      return;
    }

    setError(null);
    setInfo(null);
    setRegistering(true);
    try {
      // One call: backend will import the book (if missing) and upsert the state
      await upsertReadingState({
        userId: String(user.id),
        googleId: volumeId,
        uiStatus: status as "to-read" | "reading" | "completed",
      });

      setInfo("Saved to your reading log.");
      setNotes("");
      // keep current selection or reset if you prefer:
      // setStatus('reading');
    } catch (err) {
      console.error("Unable to save reading state", err);
      setError(
        err instanceof Error ? err.message : "Unable to save reading state."
      );
    } finally {
      setRegistering(false);
    }
  };

  if (!volumeId) return null;

  return (
    <section className="space-y-6">
      {/* header unchanged */}

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-800">
            Log this book
          </h2>
          <p className="text-sm text-slate-500">
            Choose the status you want to assign and add optional notes for your
            reading log.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-[180px,1fr]">
          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={statusOptions}
            disabled={loading || registering}
            required
          />
          <Textarea
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What are you planning to track for this book?"
            rows={3}
            disabled={registering}
          />
        </div>
        <div className="flex justify-end gap-3">
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            disabled={registering || loading}
          >
            {registering ? "Saving..." : "Save to reading log"}
          </button>
        </div>
      </form>

      {error ? (
        <Toast message={error} type="error" onDismiss={() => setError(null)} />
      ) : null}
      {info ? (
        <Toast message={info} type="success" onDismiss={() => setInfo(null)} />
      ) : null}

      {/* rest of the page unchanged */}
      <div className="flex justify-end">
        <Link
          href="/reading"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-800"
        >
          Go to reading log
        </Link>
      </div>
    </section>
  );
};

export default GoogleBookDetailPage;
