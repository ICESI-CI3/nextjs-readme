'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Input from '@/components/Form/Input';
import Toast from '@/components/Toast';
import { registerUser } from '@/services/userService';

const RegisterPage = () => {
  const router = useRouter();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim()) {
      setError('Name is required.');
      return;
    }

    if (!username.trim()) {
      setError('Username is required.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await registerUser({ username, email, password });
      setSuccess('Account created. Redirecting you to login.');
      setUsername('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => router.push('/login'), 1200);
    } catch (err) {
      console.error('Register failed', err);
      const message = err instanceof Error ? err.message : 'We could not create the account. Please try again.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-linear-to-br from-blue-50 via-white to-slate-100 px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Create your account</h1>
          <p className="text-sm text-slate-500">Start tracking your reading activity.</p>
        </div>
        {error ? <Toast message={error} type="error" onDismiss={() => setError(null)} /> : null}
        {success ? <Toast message={success} type="success" onDismiss={() => setSuccess(null)} /> : null}
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <Input
            label="Name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Your full name"
            autoComplete="name"
          />
          <Input
            label="Username"
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Pick a unique username"
            autoComplete="username"
          />
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
            autoComplete="new-password"
            minLength={6}
          />
          <Input
            label="Confirm password"
            type="password"
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="******"
            autoComplete="new-password"
            minLength={6}
          />
          <button
            type="submit"
            className="mt-2 h-11 rounded-md bg-blue-600 font-semibold text-white transition hover:bg-blue-700 disabled:bg-blue-300"
            disabled={submitting}
          >
            {submitting ? 'Creating...' : 'Create account'}
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-slate-400">
          Already have an account?&nbsp;
          <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
};

export default RegisterPage;
