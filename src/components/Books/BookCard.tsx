// src/components/BookCard.tsx
"use client";

import Link from "next/link";
import { useMemo } from "react";

type BadgeTone = "blue" | "slate";

const toneStyles: Record<BadgeTone, string> = {
  blue: "bg-blue-50 text-blue-600",
  slate: "bg-slate-100 text-slate-600",
};

export type BookCardProps = {
  id: string | number;
  title: string;
  authors?: string[] | string;
  thumbnailUrl?: string | null;
  description?: string | null;
  href?: string;
  badgeText?: string;
  badgeTone?: BadgeTone;
};

const placeholder =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="480"><rect width="100%" height="100%" fill="#eef2ff"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="16" fill="#6366f1">No cover</text></svg>`
  );

export default function BookCard({
  id,
  title,
  authors,
  thumbnailUrl,
  description,
  href,
  badgeText,
  badgeTone = "blue",
}: BookCardProps) {
  const authorText = useMemo(() => {
    if (Array.isArray(authors) && authors.length) {
      return authors.join(", ");
    }
    if (typeof authors === "string" && authors.trim().length) {
      return authors;
    }
    return "Unknown author";
  }, [authors]);

  const linkHref = href ?? `/books/${encodeURIComponent(String(id))}`;
  const toneClass = toneStyles[badgeTone] ?? toneStyles.blue;

  const hasCover = Boolean(thumbnailUrl);
  const normalizedTitle = title || 'Untitled';

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-100">
        {badgeText ? (
          <span
            className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold uppercase ${toneClass}`}
          >
            {badgeText}
          </span>
        ) : null}
        {hasCover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailUrl || placeholder}
            alt={`${normalizedTitle} cover`}
            className="h-full w-full object-cover transition group-hover:scale-[1.02]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-200 px-4 text-center">
            <span className="line-clamp-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {normalizedTitle}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold text-slate-900">
          {normalizedTitle}
        </h3>
        <p className="line-clamp-1 text-xs text-slate-500">{authorText}</p>

        {description ? (
          <p className="mt-1 line-clamp-2 text-[11px] text-slate-500/90">
            {description}
          </p>
        ) : null}

        <div className="mt-auto pt-2">
          <Link
            href={linkHref}
            className="inline-flex items-center text-sm font-semibold text-blue-700 hover:text-blue-800"
          >
            Open
            <svg
              className="ml-1 size-4"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden
            >
              <path d="M12.293 3.293a1 1 0 011.414 0l4.999 5a1 1 0 010 1.414l-5 5a1 1 0 11-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" />
            </svg>
          </Link>
        </div>
      </div>
    </article>
  );
}
