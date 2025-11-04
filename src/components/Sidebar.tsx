'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { useAuthStore } from '@/stores/authStore';

type NavItem = {
  label: string;
  href: string;
  roles?: string[];
};

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Books', href: '/books' },
  { label: 'Reading log', href: '/reading' },
  { label: 'Reviews', href: '/reviews' },
  { label: 'Clubs', href: '/clubs' },
  { label: 'Reports', href: '/reports' },
  { label: 'Admin', href: '/admin/users', roles: ['admin'] },
];

const Sidebar = () => {
  const pathname = usePathname();
  const role = useAuthStore((state) => state.user?.role ?? 'reader');

  const filteredItems = useMemo(
    () => navItems.filter((item) => !item.roles || item.roles.includes(role)),
    [role],
  );

  return (
    <aside className="flex h-full w-64 flex-col border-r border-slate-200 bg-white">
      <div className="px-6 py-5">
        <h1 className="text-xl font-semibold text-slate-800">Compunet Reads</h1>
        <p className="text-xs text-slate-400">Reading progress tracker</p>
      </div>
      <nav className="flex-1 px-3 py-2">
        <ul className="space-y-1 text-sm">
          {filteredItems.map((item) => {
            const isActive =
              pathname === item.href || (pathname?.startsWith(item.href) && item.href !== '/dashboard');
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={[
                    'flex items-center justify-between rounded-md px-3 py-2 transition',
                    isActive
                      ? 'bg-blue-50 font-semibold text-blue-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800',
                  ].join(' ')}
                >
                  <span>{item.label}</span>
                  {isActive ? (
                    <span className="h-2 w-2 rounded-full bg-blue-500 shadow-sm" aria-hidden />
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
