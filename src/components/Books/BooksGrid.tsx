// src/components/BooksGrid.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import BookCard from "./BookCard";
import { getAllBooks, type BookRecord } from "@/services/bookService";

type Book = {
  id: string;
  title: string;
  authors?: string[];
  thumbnailUrl?: string | null;
  description?: string | null;
};

export default function BooksGrid({
  initialLimit = 12,
}: {
  initialLimit?: number;
}) {
  const [books, setBooks] = useState<Book[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const data = await getAllBooks();
        if (!active) return;
        const list = Array.isArray(data) ? data : [];
        const normalizedBooks: Book[] = list
          .filter((item): item is BookRecord => item !== null && typeof item === 'object')
          .map((item) => ({
            id: String(item.id ?? ''),
            title: item.title ?? '',
            authors: Array.isArray(item.authors)
              ? item.authors
              : typeof item.authors === 'string'
              ? item.authors.split(',').map((a: string) => a.trim())
              : [],
            thumbnailUrl: item.thumbnailUrl ?? item.cover ?? null,
            description: item.description ?? null,
          }));
        setBooks(normalizedBooks);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const base = books.slice(0, Math.max(initialLimit, 0));
    if (!term) return base;
    return base.filter((b) => {
      const hay = `${b.title ?? ""} ${
        b.authors?.join(" ") ?? ""
      }`.toLowerCase();
      return hay.includes(term);
    });
  }, [books, q, initialLimit]);

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <label className="block text-sm font-medium text-slate-700">
          Search books
        </label>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Title or author…"
          className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500"
        />
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-[340px] animate-pulse rounded-2xl bg-slate-200"
            />
          ))}
        </div>
      ) : filtered.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((b) => (
            <BookCard
              key={b.id}
              id={b.id}
              title={b.title}
              authors={b.authors}
              thumbnailUrl={b.thumbnailUrl ?? null}
              description={b.description}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm text-slate-600">No books found.</p>
        </div>
      )}
    </section>
  );
}
