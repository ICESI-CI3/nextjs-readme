'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const formatSegment = (segment: string) => segment.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const Breadcrumbs = () => {
  const pathname = usePathname();

  if (!pathname) return null;

  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) {
    return (
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-sm text-slate-500">
          <li className="font-medium text-slate-700">Home</li>
        </ol>
      </nav>
    );
  }

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <li>
          <Link href="/dashboard" className="hover:text-slate-700">
            Home
          </Link>
        </li>
        {segments.map((segment, index) => {
          const href = `/${segments.slice(0, index + 1).join('/')}`;
          const isLast = index === segments.length - 1;
          return (
            <li key={href} className="flex items-center gap-2">
              <span>/</span>
              {isLast ? (
                <span className="font-medium text-slate-700">{formatSegment(segment)}</span>
              ) : (
                <Link href={href} className="hover:text-slate-700">
                  {formatSegment(segment)}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
