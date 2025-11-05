'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Nav from '@/components/Nav';
import Sidebar from '@/components/Sidebar';
import { useAuthStore } from '@/stores/authStore';

type AppShellProps = {
  children: ReactNode;
};

const publicRoutes = ['/login', '/register'];

const AppShell = ({ children }: AppShellProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const initialize = useAuthStore((state) => state.initialize);
  const initialized = useAuthStore((state) => state.initialized);
  const status = useAuthStore((state) => state.status);
  const token = useAuthStore((state) => state.token);
  const initRequestedRef = useRef(false);

  useEffect(() => {
    if (!initRequestedRef.current && !initialized) {
      initRequestedRef.current = true;
      initialize().catch((error) => console.error('Auth init failed', error));
    }
  }, [initialize, initialized]);

  const isPublic =
    !pathname ||
    pathname === '/' ||
    publicRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
  useEffect(() => {
    if (!isPublic && initialized && !token && pathname) {
      const redirectUrl = `/login?redirectTo=${encodeURIComponent(pathname)}`;
      router.push(redirectUrl);
    }
  }, [initialized, token, router, isPublic, pathname]);

  if (!initialized && status !== 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
        Loading your workspace...
      </div>
    );
  }

  if (isPublic) {
    return <div className="min-h-screen bg-slate-50">{children}</div>;
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Nav />
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6">{children}</main>
      </div>
    </div>
  );
};

export default AppShell;
