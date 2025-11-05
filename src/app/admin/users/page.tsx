'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Input from '@/components/Form/Input';
import Select from '@/components/Form/Select';
import Toast from '@/components/Toast';
import { useAuthStore } from '@/stores/authStore';
import { createUser, deleteUser, getUsers, updateUser } from '@/services/userService';

type User = {
  id?: string | number;
  name?: string;
  username?: string;
  email?: string;
  role?: string;
  active?: boolean;
  isActive?: boolean;
  status?: string;
};

const AdminUsersPage = () => {
  const user = useAuthStore((state) => state.user);
  const role = user?.role ?? 'reader';
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | number | null>(null);
  const [roleUpdatingId, setRoleUpdatingId] = useState<string | number | null>(null);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    role: 'reader',
  });
  const roleOptions = [
    { value: 'reader', label: 'Reader' },
    { value: 'admin', label: 'Admin' },
  ];

  useEffect(() => {
    if (role !== 'admin') {
      setLoading(false);
      return;
    }

    let active = true;

    const loadUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        const list = await getUsers();
        if (!active) return;
        const normalized = Array.isArray(list) ? list : list ? [list] : [];
        setUsers(normalized);
      } catch (err) {
        console.error('Unable to load users', err);
        if (!active) return;
        setError('Unable to load users. Please try again.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadUsers();
    return () => {
      active = false;
    };
  }, [role]);

  const filteredUsers = useMemo(() => {
    return users.filter((item) => {
      const content = `${item.name ?? ''} ${item.username ?? ''} ${item.email ?? ''} ${item.role ?? ''}`.toLowerCase();
      return content.includes(searchTerm.toLowerCase());
    });
  }, [users, searchTerm]);

  const resolveActiveState = (item: User) => {
    if (typeof item.isActive === 'boolean') return item.isActive;
    if (typeof item.active === 'boolean') return item.active;
    if (typeof item.status === 'string') return item.status !== 'disabled';
    return true;
  };

  const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setInfo(null);

    const payload = {
      name: newUser.name.trim(),
      username: newUser.username.trim(),
      email: newUser.email.trim(),
      password: newUser.password,
      role: newUser.role,
    };

    if (!payload.name || !payload.username || !payload.email || !payload.password) {
      setError('Please complete all fields to create a user.');
      return;
    }

    setCreating(true);
    try {
      const created = await createUser(payload);
      const normalized = Array.isArray(created) ? created[0] : created?.user ?? created ?? null;
      if (normalized) {
        setUsers((prev) => [normalized as User, ...prev]);
      }
      setInfo('User created.');
      setNewUser({
        name: '',
        username: '',
        email: '',
        password: '',
        role: 'reader',
      });
    } catch (err) {
      console.error('Unable to create user', err);
      setError('Unable to create user right now.');
    } finally {
      setCreating(false);
    }
  };

  const handleRoleChange = async (target: User, newRole: string) => {
    if (!target.id) return;
    if ((target.role ?? 'reader') === newRole) return;
    if (user?.id && String(user.id) === String(target.id)) {
      setError('You cannot change your own role.');
      return;
    }
    if (newRole === 'moderator') {
      setInfo('Moderators are readers who run clubs they create. Update the user to admin only if they need elevated access.');
      return;
    }

    setRoleUpdatingId(target.id);
    setError(null);
    setInfo(null);
    try {
      await updateUser(target.id, { role: newRole });
      setUsers((prev) =>
        prev.map((item) =>
          item.id === target.id
            ? {
                ...item,
                role: newRole,
              }
            : item,
        ),
      );
      setInfo('Role updated.');
    } catch (err) {
      console.error('Role update failed', err);
      setError('Unable to update user role.');
    } finally {
      setRoleUpdatingId(null);
    }
  };

  const handleToggleActive = async (target: User) => {
    if (!target.id) return;
    if (user?.id && String(user.id) === String(target.id)) {
      setError('You cannot change your own status.');
      return;
    }
    const currentActive = resolveActiveState(target);
    setProcessingId(target.id);
    setError(null);
    setInfo(null);
    try {
      await updateUser(target.id, { active: !currentActive }); // TODO: adjust payload to match API expectation
      setUsers((prev) =>
        prev.map((item) =>
          item.id === target.id
            ? {
                ...item,
                active: !currentActive,
                isActive: !currentActive,
                status: !currentActive ? 'active' : 'disabled',
              }
            : item,
        ),
      );
      setInfo(!currentActive ? 'User enabled.' : 'User disabled.');
    } catch (err) {
      console.error('Toggle failed', err);
      setError('Unable to update user at the moment.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (target: User) => {
    if (!target.id) return;
    if (user?.id && String(user.id) === String(target.id)) {
      setError('You cannot delete your own account.');
      return;
    }
    setProcessingId(target.id);
    setError(null);
    setInfo(null);
    try {
      await deleteUser(target.id);
      setUsers((prev) => prev.filter((item) => item.id !== target.id));
      setInfo('User removed.');
    } catch (err) {
      console.error('Delete failed', err);
      setError('Unable to delete this user.');
    } finally {
      setProcessingId(null);
    }
  };

  if (role !== 'admin') {
    return (
      <section className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-slate-900">User management</h1>
          <p className="text-sm text-slate-500">Administrative access required.</p>
        </header>
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          You do not have permission to view this page.
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">User management</h1>
        <p className="text-sm text-slate-500">Enable, disable, or remove user access to the platform.</p>
      </header>

      {error ? <Toast message={error} type="error" onDismiss={() => setError(null)} /> : null}
      {info ? <Toast message={info} type="success" onDismiss={() => setInfo(null)} /> : null}

      <form
        onSubmit={handleCreateUser}
        className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="grid flex-1 gap-3 sm:grid-cols-2">
            <Input
              label="Name"
              value={newUser.name}
              onChange={(event) => setNewUser((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="New team member"
              required
            />
            <Input
              label="Username"
              value={newUser.username}
              onChange={(event) => setNewUser((prev) => ({ ...prev, username: event.target.value }))}
              placeholder="unique username"
              required
            />
            <Input
              label="Email"
              type="email"
              value={newUser.email}
              onChange={(event) => setNewUser((prev) => ({ ...prev, email: event.target.value }))}
              placeholder="user@example.com"
              required
            />
            <Input
              label="Password"
              type="password"
              value={newUser.password}
              onChange={(event) => setNewUser((prev) => ({ ...prev, password: event.target.value }))}
              placeholder="Temporary password"
              minLength={6}
              required
            />
            <Select
              label="Role"
              value={newUser.role}
              onChange={(event) => setNewUser((prev) => ({ ...prev, role: event.target.value }))}
              options={roleOptions}
            />
          </div>
          <button
            type="submit"
            className="h-11 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            disabled={creating}
          >
            {creating ? 'Creating...' : 'Create user'}
          </button>
        </div>
        <p className="text-xs text-slate-500">
          New users receive the selected role immediately. Share the temporary password securely.
        </p>
      </form>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <Input
          label="Search users"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Filter by name, email, or role"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-14 animate-pulse rounded-lg bg-slate-200" />
          ))}
        </div>
      ) : filteredUsers.length ? (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-600">
              {filteredUsers.map((item) => {
                const isActive = resolveActiveState(item);
                const rawRoleValue = (item.role ?? 'reader').toString().toLowerCase();
                const roleValue = rawRoleValue === 'moderator' ? 'reader' : rawRoleValue;
                const isSelf = user?.id && item.id ? String(user.id) === String(item.id) : false;
                return (
                  <tr key={(item.id ?? item.email ?? '').toString()}>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-800">{item.name ?? 'Unnamed user'}</span>
                        {item.username ? (
                          <span className="text-xs uppercase tracking-wide text-slate-400">@{item.username}</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">{item.email ?? 'N/A'}</td>
                    <td className="px-4 py-3">
                      <select
                        className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold uppercase text-slate-600 transition hover:border-slate-400 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        value={roleValue}
                        onChange={(event) => handleRoleChange(item, event.target.value)}
                        disabled={isSelf || roleUpdatingId === item.id || processingId === item.id}
                      >
                        {roleOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label.toUpperCase()}
                          </option>
                        ))}
                      </select>
                      {isSelf ? (
                        <p className="mt-1 text-[10px] uppercase text-slate-400">Cannot change your own role</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={[
                          'rounded-full px-3 py-1 text-xs font-semibold uppercase',
                          isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600',
                        ].join(' ')}
                      >
                        {isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(item)}
                          className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={processingId === item.id}
                        >
                          {processingId === item.id ? 'Saving...' : isActive ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          className="rounded-md border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={processingId === item.id || isSelf}
                        >
                          {processingId === item.id ? 'Removing...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          No users found for this filter.
        </div>
      )}
    </section>
  );
};

export default AdminUsersPage;
