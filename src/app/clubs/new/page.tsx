'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Input from '@/components/Form/Input';
import Textarea from '@/components/Form/Textarea';
import Select from '@/components/Form/Select';
import Toast from '@/components/Toast';
import { createReadingClub } from '@/services/readingClubService';
import { useAuthStore } from '@/stores/authStore';

type ClubForm = {
  name: string;
  description: string;
  meetingCadence: string;
  currentBook: string;
};

const defaultForm: ClubForm = {
  name: '',
  description: '',
  meetingCadence: 'weekly',
  currentBook: '',
};

const cadenceOptions = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'as-needed', label: 'As needed' },
];

const ClubCreatePage = () => {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [form, setForm] = useState<ClubForm>(defaultForm);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isAuthorized = Boolean(user?.id);

  const updateField = <Key extends keyof ClubForm>(key: Key, value: ClubForm[Key]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      setError('Club name is required.');
      return false;
    }
    if (!form.description.trim()) {
      setError('Add a short description for the club.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isAuthorized) return;
    setError(null);
    setSuccess(null);
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      await createReadingClub({
        name: form.name,
        description: form.description,
        meetingCadence: form.meetingCadence,
        currentBook: form.currentBook,
        moderatorId: user?.id ? String(user.id) : undefined,
        ownerId: user?.id ? String(user.id) : undefined,
      });
      setSuccess('Club created successfully.');
      setTimeout(() => router.push('/clubs'), 1000);
    } catch (err) {
      console.error('Failed to create club', err);
      setError('Unable to create club. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthorized) {
    return (
      <section className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-slate-900">Create a club</h1>
          <p className="text-sm text-slate-500">Sign in to start and moderate your own reading club.</p>
        </header>
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          You need an active session to create a new club. Please log in, then come back to start organizing your readers.
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Create a club</h1>
        <p className="text-sm text-slate-500">
          Gather readers around a shared goal; whoever starts the club becomes its moderator automatically.
        </p>
      </header>

      {error ? <Toast message={error} type="error" onDismiss={() => setError(null)} /> : null}
      {success ? <Toast message={success} type="success" onDismiss={() => setSuccess(null)} /> : null}

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <Input
          label="Club name"
          value={form.name}
          onChange={(event) => updateField('name', event.target.value)}
          required
        />
        <Textarea
          label="Description"
          value={form.description}
          onChange={(event) => updateField('description', event.target.value)}
          placeholder="What will members explore together?"
          required
        />
        <div className="grid gap-4 md:grid-cols-2">
          <Select
            label="Meeting cadence"
            value={form.meetingCadence}
            onChange={(event) => updateField('meetingCadence', event.target.value)}
            options={cadenceOptions}
          />
          <Input
            label="Current book (optional)"
            value={form.currentBook}
            onChange={(event) => updateField('currentBook', event.target.value)}
            placeholder="Title of the book being read"
          />
        </div>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push('/clubs')}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            disabled={submitting}
          >
            {submitting ? 'Saving…' : 'Create club'}
          </button>
        </div>
      </form>
    </section>
  );
};

export default ClubCreatePage;
