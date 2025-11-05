"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerUser } from "@/services/userService";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [username, setUsername] = useState(""); // mantenido si tu back lo usa
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim()) return setError("Name is required.");
    if (!username.trim()) return setError("Username is required.");
    if (password !== confirmPassword)
      return setError("Passwords do not match.");

    setSubmitting(true);
    try {
      // Si tu backend espera { name, email, password } puedes enviar también "username" y que lo ignore;
      // si tu servicio TS no lo permite, cambia a: registerUser({ name, email, password });
      await registerUser({ name, username, email, password });
      setSuccess("Account created. Redirecting you to login.");
      setName("");
      setUsername("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setTimeout(() => router.push("/login"), 1200);
    } catch (err) {
      console.error("Register failed", err);
      setError(
        err instanceof Error
          ? err.message
          : "We could not create the account. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-white antialiased">
      {/* Button back to Home */}
      <Link
        href="/"
        className="group absolute left-4 top-4 z-10 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm backdrop-blur transition hover:bg-white sm:left-6 sm:top-6"
        aria-label="Back to Home"
      >
        <svg
          className="size-4 -ml-0.5 transition group-hover:-translate-x-0.5"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path d="M12.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L8.414 9H17a1 1 0 110 2H8.414l4.293 4.293a1 1 0 010 1.414z" />
        </svg>
        Home
      </Link>

      {/* Background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_top_left,rgba(59,130,246,0.08),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(99,102,241,0.08),transparent_50%)]"
      />
      <div
        aria-hidden
        className="absolute -top-24 -left-24 -z-10 h-72 w-72 rounded-full bg-blue-200/50 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -bottom-24 -right-24 -z-10 h-72 w-72 rounded-full bg-indigo-200/50 blur-3xl"
      />

      <section className="mx-auto flex min-h-screen max-w-md items-center justify-center px-4">
        <div className="w-full rounded-2xl border border-slate-200/70 bg-white/70 p-6 shadow-xl backdrop-blur-sm sm:p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Join Read.Me
            </div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Create your account
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Start tracking your reading activity.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {error}
            </div>
          )}
          {success && (
            <div
              role="status"
              className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
            >
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-2 space-y-4">
            {/* Name */}
            <div>
              <label
                className="mb-1.5 block text-sm font-medium text-slate-700"
                htmlFor="name"
              >
                Name
              </label>
              <input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                placeholder="Your full name"
                className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500"
              />
            </div>

            {/* Username */}
            <div>
              <label
                className="mb-1.5 block text-sm font-medium text-slate-700"
                htmlFor="username"
              >
                Username
              </label>
              <input
                id="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                placeholder="Pick a unique username"
                className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500"
              />
            </div>

            {/* Email */}
            <div>
              <label
                className="mb-1.5 block text-sm font-medium text-slate-700"
                htmlFor="email"
              >
                Email
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="peer block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 pl-10 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500"
                />
                <svg
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400 peer-focus:text-blue-500"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden
                >
                  <path d="M2.25 6.75A3.75 3.75 0 016 3h12a3.75 3.75 0 013.75 3.75v10.5A3.75 3.75 0 0118 21H6a3.75 3.75 0 01-3.75-3.75V6.75zM6.62 7.5a.75.75 0 10-.74 1.31l5.75 3.25a.75.75 0 00.74 0l5.75-3.25a.75.75 0 10-.74-1.31L12 10.62 6.62 7.5z" />
                </svg>
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                className="mb-1.5 block text-sm font-medium text-slate-700"
                htmlFor="password"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="••••••"
                  className="peer block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-10 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-slate-400 transition hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label={showPwd ? "Hide password" : "Show password"}
                >
                  {/* same icons as login */}
                  {showPwd ? (
                    <svg
                      viewBox="0 0 24 24"
                      className="size-4"
                      fill="currentColor"
                      aria-hidden
                    >
                      <path d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7zm0 12a5 5 0 110-10 5 5 0 010 10z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      className="size-4"
                      fill="currentColor"
                      aria-hidden
                    >
                      <path d="M2 12s3-7 10-7c2.1 0 3.9.6 5.4 1.5l1.8-1.8 1.4 1.4-18 18-1.4-1.4 3.1-3.1C3.3 17.7 2 12 2 12zm7.6.6l3.8-3.8A4.9 4.9 0 0012 8a4 4 0 00-4 4c0 .2 0 .4.1.6zM12 19c7 0 10-7 10-7a18.3 18.3 0 00-6.2-5.8l-2.2 2.2c1.4.6 2.4 2 2.4 3.6a4 4 0 01-4 4c-1.6 0-3-.9-3.6-2.3L5.8 16C7.3 17.6 9.5 19 12 19z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Confirm */}
            <div>
              <label
                className="mb-1.5 block text-sm font-medium text-slate-700"
                htmlFor="confirm"
              >
                Confirm password
              </label>
              <div className="relative">
                <input
                  id="confirm"
                  type={showPwd2 ? "text" : "password"}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="••••••"
                  className="peer block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-10 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd2((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-slate-400 transition hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label={showPwd2 ? "Hide password" : "Show password"}
                >
                  {showPwd2 ? (
                    <svg
                      viewBox="0 0 24 24"
                      className="size-4"
                      fill="currentColor"
                      aria-hidden
                    >
                      <path d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7zm0 12a5 5 0 110-10 5 5 0 010 10z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      className="size-4"
                      fill="currentColor"
                      aria-hidden
                    >
                      <path d="M2 12s3-7 10-7c2.1 0 3.9.6 5.4 1.5l1.8-1.8 1.4 1.4-18 18-1.4-1.4 3.1-3.1C3.3 17.7 2 12 2 12zm7.6.6l3.8-3.8A4.9 4.9 0 0012 8a4 4 0 00-4 4c0 .2 0 .4.1.6zM12 19c7 0 10-7 10-7a18.3 18.3 0 00-6.2-5.8l-2.2 2.2c1.4.6 2.4 2 2.4 3.6a4 4 0 01-4 4c-1.6 0-3-.9-3.6-2.3L5.8 16C7.3 17.6 9.5 19 12 19z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Creating…" : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-blue-700 hover:text-blue-800"
            >
              Log in
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
