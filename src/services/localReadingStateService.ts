type StoredReadingStates = Record<string, LocalReadingState[]>;

const STORAGE_KEY = 'readme.localReadingStates';

export type LocalReadingState = {
  id: string;
  userId: string;
  googleId?: string;
  bookId?: string;
  title?: string;
  authors?: string;
  cover?: string;
  description?: string;
  status: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

const readStore = (): StoredReadingStates => {
  if (typeof window === 'undefined') {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed ? parsed : {};
  } catch (error) {
    console.error('Unable to read local reading states store', error);
    return {};
  }
};

const writeStore = (store: StoredReadingStates) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (error) {
    console.error('Unable to write local reading states store', error);
  }
};

const generateId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const getLocalReadingStates = (userId: string): LocalReadingState[] => {
  const store = readStore();
  return store[userId] ? [...store[userId]] : [];
};

export const addLocalReadingState = (
  userId: string,
  data: Omit<LocalReadingState, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
): LocalReadingState => {
  const store = readStore();
  const entry: LocalReadingState = {
    ...data,
    id: generateId(),
    userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const existing = store[userId] ?? [];
  store[userId] = [entry, ...existing];
  writeStore(store);
  return entry;
};

export const updateLocalReadingState = (
  userId: string,
  id: string,
  updates: Partial<Pick<LocalReadingState, 'status' | 'notes'>>,
): LocalReadingState | null => {
  const store = readStore();
  const existing = store[userId];
  if (!existing) {
    return null;
  }
  const next = existing.map((item) => {
    if (item.id !== id) {
      return item;
    }
    return {
      ...item,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
  });
  const updated = next.find((item) => item.id === id) ?? null;
  store[userId] = next;
  writeStore(store);
  return updated;
};

export const deleteLocalReadingState = (userId: string, id: string): void => {
  const store = readStore();
  const existing = store[userId];
  if (!existing) {
    return;
  }
  store[userId] = existing.filter((item) => item.id !== id);
  writeStore(store);
};
