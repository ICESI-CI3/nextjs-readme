import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function Home() {
  const token = (await cookies()).get('token');

  if (token?.value) {
    redirect('/dashboard');
  }

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center gap-12 px-6 py-16 text-center sm:text-left">
      <div className="absolute inset-0 -z-10 bg-linear-to-br from-slate-100 via-white to-blue-50" aria-hidden />
      <div className="rounded-full bg-blue-100 px-4 py-1 text-xs font-semibold uppercase text-blue-600">
        Welcome to Read.Me
      </div>
      <div className="flex flex-col items-center gap-6 sm:items-start">
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Track your reading, join clubs, and share reviews in one place.
        </h1>
        <p className="max-w-2xl text-lg text-slate-600">
          Organize your library, monitor progress, collaborate with clubs, and stay on top of reporting with a
          workspace built for passionate readers and administrators.
        </p>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row">
        <Link
          href="/login"
          className="flex h-12 items-center justify-center rounded-md bg-blue-600 px-8 font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          Log in to your library
        </Link>
      
      </div>
      <section id="features" className="grid w-full gap-6 rounded-xl border border-slate-200 bg-white p-8 shadow-sm sm:grid-cols-3">
        {['Manage your books', 'Engage with clubs', 'Monitor reports'].map((feature) => (
          <article key={feature} className="flex flex-col gap-2 text-left">
            <h3 className="text-base font-semibold text-slate-800">{feature}</h3>
            <p className="text-sm text-slate-500">
              Centralize the data that matters most, collaborate with your community, and stay ahead of reading goals.
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
