import apiClient, { resolveAuthToken } from "./apiClient";

type Serializable =
  | string
  | number
  | boolean
  | null
  | Serializable[]
  | { [key: string]: Serializable | null | undefined };

export type ClubMemberRecord = {
  id?: string | number;
  name?: string;
  email?: string;
  [key: string]: unknown;
};

export type DebateMessageRecord = {
  id?: string | number;
  author?: ClubMemberRecord | string;
  message?: string;
  createdAt?: string;
  [key: string]: unknown;
};

export type DebateRecord = {
  id?: string | number;
  topic?: string;
  messages?: DebateMessageRecord[];
  [key: string]: unknown;
};

export type ClubRecord = {
  id?: string | number;
  name?: string;
  description?: string;
  currentBook?: {
    title?: string;
    author?: string;
    [key: string]: unknown;
  } | null;
  book?: string;
  members?: ClubMemberRecord[] | Array<string | number>;
  meetingCadence?: string;
  ownerId?: string | number;
  debates?: DebateRecord[];
  [key: string]: unknown;
};

const toPathSegment = (value: string | number): string =>
  encodeURIComponent(String(value));

const requireAuth = (): string | null => resolveAuthToken();

const sanitizePayload = (
  input: Record<string, Serializable | undefined | null> = {}
): Record<string, Serializable> =>
  Object.entries(input).reduce<Record<string, Serializable>>(
    (accumulator, [key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        accumulator[key] = value as Serializable;
      }
      return accumulator;
    },
    {}
  );

export const createReadingClub = async (
  clubData: Record<string, Serializable | undefined | null>
): Promise<ClubRecord | null> => {
  if (!requireAuth()) return null;

  const payload = sanitizePayload(clubData);
  const { data } = await apiClient.post<ClubRecord>(
    '/reading-clubs',
    payload
  );
  return (data ?? null) as ClubRecord | null;
};

export const getReadingClubs = async (): Promise<ClubRecord[] | null> => {
  if (!requireAuth()) return null;

  const { data } = await apiClient.get<ClubRecord[]>(
    '/reading-clubs'
  );
  return (data ?? null) as ClubRecord[] | null;
};

export const getReadingClubById = async (
  id: string | number
): Promise<ClubRecord | null> => {
  if (!requireAuth()) return null;

  const { data } = await apiClient.get<ClubRecord>(
    `/reading-clubs/${toPathSegment(id)}`
  );
  return (data ?? null) as ClubRecord | null;
};

export const updateReadingClub = async (
  id: string | number,
  clubData: Record<string, Serializable | undefined | null>
): Promise<ClubRecord | null> => {
  if (!requireAuth()) return null;

  const payload = sanitizePayload(clubData);
  const { data } = await apiClient.patch<ClubRecord>(
    `/reading-clubs/${toPathSegment(id)}`,
    payload
  );
  return (data ?? null) as ClubRecord | null;
};

export const deleteReadingClub = async (
  id: string | number
): Promise<ClubRecord | null> => {
  if (!requireAuth()) return null;

  const { data } = await apiClient.delete<ClubRecord>(
    `/reading-clubs/${toPathSegment(id)}`
  );
  return (data ?? null) as ClubRecord | null;
};

export const joinReadingClub = async (
  clubId: string | number,
  userId: string | number
): Promise<ClubRecord | null> => {
  if (!requireAuth()) return null;

  const { data } = await apiClient.post<ClubRecord>(
    `/reading-clubs/${toPathSegment(clubId)}/join/${toPathSegment(userId)}`,
    {}
  );
  return (data ?? null) as ClubRecord | null;
};

export const startDebate = async (
  clubId: string | number,
  debateData: Record<string, Serializable | undefined | null>
): Promise<ClubRecord | null> => {
  if (!requireAuth()) return null;

  const payload = sanitizePayload(debateData);
  const { data } = await apiClient.post<ClubRecord>(
    `/reading-clubs/${toPathSegment(clubId)}/debates`,
    payload
  );
  return (data ?? null) as ClubRecord | null;
};

export const addDebateMessage = async (
  debateId: string | number,
  messageData: Record<string, Serializable | undefined | null>
): Promise<ClubRecord | null> => {
  if (!requireAuth()) return null;

  const payload = sanitizePayload(messageData);
  const { data } = await apiClient.post<ClubRecord>(
    `/reading-clubs/debates/${toPathSegment(debateId)}/messages`,
    payload
  );
  return (data ?? null) as ClubRecord | null;
};

export const isModerator = async (
  clubId: string | number
): Promise<boolean | ClubRecord | null> => {
  if (!requireAuth()) return null;

  const { data } = await apiClient.get<boolean | ClubRecord>(
    `/reading-clubs/moderator/${toPathSegment(clubId)}`
  );
  return data ?? null;
};
