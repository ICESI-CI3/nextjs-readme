'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Input from '@/components/Form/Input';
import Toast from '@/components/Toast';
import { useAuthStore } from '@/stores/authStore';

const LoginPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useAuthStore((state) => state.login);
  const status = useAuthStore((state) => state.status);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    try {
      await login({ email, password });
      const redirectTo = searchParams.get('redirectTo') || '/dashboard';
      router.push(redirectTo);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Login failed. Check your credentials and try again.');
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-linear-to-br from-blue-50 via-white to-slate-100 px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Compunet Reads</h1>
          <p className="text-sm text-slate-500">Sign in to manage books, reviews, clubs, and progress.</p>
        </div>
        {error ? <Toast message={error} type="error" onDismiss={() => setError(null)} /> : null}
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
          <Input
            label="Password"
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="******"
            autoComplete="current-password"
            minLength={6}
          />
          <button
            type="submit"
            className="mt-2 h-11 rounded-md bg-blue-600 font-semibold text-white transition hover:bg-blue-700 disabled:bg-blue-300"
            disabled={status === 'loading'}
          >
            {status === 'loading' ? 'Signing in...' : 'Log in'}
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-slate-400">
          Need an account?&nbsp;
          <Link href="/register" className="font-medium text-blue-600 hover:text-blue-700">
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
};

export default LoginPage;
