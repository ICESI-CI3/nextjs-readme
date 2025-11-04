'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Breadcrumbs from './Breadcrumbs';
import { useAuthStore } from '@/stores/authStore';

const Nav = () => {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);
  const logout = useAuthStore((state) => state.logout);

  const userLabel = useMemo(() => {
    if (!user) return 'Guest';
    return user.name ?? user.email ?? 'User';
  }, [user]);

  const role = user?.role ?? 'reader';

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="flex flex-col gap-4 border-b border-slate-200 bg-white px-6 py-4">
      <div className="flex items-center justify-between">
        <Breadcrumbs />
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <div className="flex flex-col text-right">
            <span className="font-semibold text-slate-800">
              {status === 'loading' ? 'Loading...' : userLabel}
            </span>
            <span className="uppercase tracking-wide text-xs text-slate-400">{role}</span>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-md border border-slate-300 px-3 py-1 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-800"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default Nav;
