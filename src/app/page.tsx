import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
// 1. Imports actualizados a lucide-react
import {
  BookOpen,
  MessageSquareText,
  PieChart,
  CloudDownload,
  Users,
  ArrowRight, // Para el botón CTA
} from "lucide-react";

export default async function Home() {
  const token = (await cookies()).get("token");
  if (token?.value) redirect("/dashboard");

  return (
    <main className="relative min-h-screen overflow-x-hidden antialiased text-slate-800">
      {/* --- Fondo Mejorado (Aurora Fijo) --- */}
      <div className="absolute inset-0 -z-30 h-full w-full bg-gray-50 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]"></div>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-20 overflow-hidden"
      >
        <div className="absolute top-0 -left-1/4 h-[800px] w-[800px] rounded-full bg-gradient-to-r from-blue-200/50 to-indigo-200/50 opacity-60 blur-3xl filter" />
        <div className="absolute bottom-0 -right-1/4 h-[800px] w-[800px] rounded-full bg-gradient-to-l from-indigo-200/50 to-blue-200/50 opacity-60 blur-3xl filter" />
      </div>

      {/* --- Header (Nuevo) --- */}
      <header className="fixed top-0 left-0 z-50 w-full border-b border-black/5 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link
            href="/"
            className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"
          >
            Read.Me
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-semibold text-slate-700 transition hover:text-blue-600"
            >
              Log In
            </Link>
            <Link
              href="/register"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:brightness-110"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* --- Hero --- */}
      <section className="relative mx-auto flex max-w-6xl flex-col items-center gap-10 px-6 pb-20 pt-28 sm:pt-36">
        {/* Badge */}
        <div className="rounded-full border border-blue-200 bg-white px-4 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700 shadow-sm">
          Welcome to Read.Me
        </div>

        {/* Title + copy */}
        <div className="flex w-full max-w-3xl flex-col items-center text-center">
          <h1 className="bg-gradient-to-bl from-slate-900 to-slate-700 bg-clip-text text-4xl font-extrabold leading-tight text-transparent sm:text-6xl">
            Tu biblioteca personal.
            <br /> Tu comunidad de lectura.
          </h1>
          <p className="mt-5 max-w-2xl text-balance text-lg text-slate-600 sm:text-xl">
            Organiza tu progreso, descubre nuevos libros, únete a clubes y
            comparte reseñas. Todo en un solo lugar.
          </p>
        </div>

        {/* CTA */}
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <Link
            href="/register"
            className="group inline-flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-7 text-base font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            Empezar Gratis
            {/* 2. Icono del botón reemplazado */}
            <ArrowRight className="ml-2 size-4 transition group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/login"
            className="text-sm font-semibold text-slate-700 transition hover:text-blue-600"
          >
            Ya tengo una cuenta
          </Link>
        </div>

        {/* Hero Image (Mockup) */}
        <div className="relative mt-12 w-full max-w-5xl">
          <div className="absolute -bottom-10 left-1/2 -z-10 h-1/2 w-3/4 -translate-x-1/2 rounded-full bg-blue-300/30 blur-3xl" />
        </div>
      </section>

      {/* --- Features (Bento Grid) --- */}
      <section id="features" className="mx-auto w-full max-w-6xl px-6 pb-20">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
            Todo lo que necesitas, en un solo lugar.
          </h2>
          <p className="mt-3 text-lg text-slate-600">
            Desde tu lista de lectura personal hasta reportes de administrador.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Tarjeta 1: Gestión (Grande) */}
          <article className="group relative rounded-2xl border border-slate-200/50 bg-white/80 p-6 shadow-lg backdrop-blur-md lg:col-span-2">
            <div className="mb-4 inline-flex size-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              {/* 3. Icono de Libro reemplazado */}
              <BookOpen className="size-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">
              Gestiona tu biblioteca
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Centraliza tus libros, actualiza tu estado (leyendo, leído,
              pendiente) y mira tu progreso de un vistazo.
            </p>
          </article>

          {/* Tarjeta 2: Clubes (Mediana) */}
          <article className="group relative rounded-2xl border border-slate-200/50 bg-white/80 p-6 shadow-lg backdrop-blur-md lg:row-span-2">
            <div className="mb-4 inline-flex size-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
              {/* 4. Icono de Usuarios reemplazado */}
              <Users className="size-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">
              Únete a Clubes de Lectura
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Crea o únete a clubes, inicia debates y comparte tus opiniones con
              otros lectores apasionados. Fomenta la comunidad y descubre Check
              nuevas perspectivas.
            </p>
          </article>

          {/* Tarjeta 3: Google Books (Pequeña) */}
          <article className="group relative rounded-2xl border border-slate-200/50 bg-white/80 p-6 shadow-lg backdrop-blur-md">
            <div className="mb-4 inline-flex size-10 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
              {/* 5. Icono de Nube reemplazado */}
              <CloudDownload className="size-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">
              Importa con Google Books
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Añade libros buscando en Google Books y rellena automáticamente
              toda la información.
            </p>
          </article>

          {/* Tarjeta 4: Reseñas (Pequeña) */}
          <article className="group relative rounded-2xl border border-slate-200/50 bg-white/80 p-6 shadow-lg backdrop-blur-md">
            <div className="mb-4 inline-flex size-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
              {/* 6. Icono de Chat/Texto reemplazado */}
              <MessageSquareText className="size-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">
              Escribe y Comparte Reseñas
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Califica los libros y comparte tus opiniones detalladas con la
              comunidad.
            </p>
          </article>

          {/* Tarjeta 5: Reportes (Grande) */}
          <article className="group relative rounded-2xl border border-slate-200/50 bg-white/80 p-6 shadow-lg backdrop-blur-md lg:col-span-3">
            <div className="mb-4 inline-flex size-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              {/* 7. Icono de Gráfica reemplazado */}
              <PieChart className="size-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">
              Reportes para Admins
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              ¿Eres administrador de un club? Monitorea los libros más leídos,
              los usuarios más activos y la participación general.
            </p>
          </article>
        </div>
      </section>

      {/* --- Footer --- */}
      <footer className="mx-auto w-full max-w-6xl px-6 pb-10">
        <div className="border-t border-slate-200 pt-8 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} Read.Me — Compunet III 
        </div>
      </footer>
    </main>
  );
}
