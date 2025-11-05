import axios from "axios";
import { URL_BASE } from "../constants/global";

type Serializable =
  | string
  | number
  | boolean
  | null
  | Serializable[]
  | { [key: string]: Serializable | null | undefined };

type ClubRecord = Record<string, unknown>;

const getToken = (): string | null =>
  typeof window === "undefined" ? null : localStorage.getItem("token");

const getAuthHeaders = (): { Authorization: string } | null => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : null;
};

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
  const headers = getAuthHeaders();
  if (!headers) return null;

  const payload = sanitizePayload(clubData);
  const { data } = await axios.post<ClubRecord>(
    `${URL_BASE}/reading-clubs`,
    payload,
    {
      headers,
    }
  );
  return (data ?? null) as ClubRecord | null;
};

export const getReadingClubs = async (): Promise<ClubRecord[] | null> => {
  const headers = getAuthHeaders();
  if (!headers) return null;

  const { data } = await axios.get<ClubRecord[]>(
    `${URL_BASE}/reading-clubs`,
    {
      headers,
    }
  );
  return (data ?? null) as ClubRecord[] | null;
};

export const getReadingClubById = async (
  id: string | number
): Promise<ClubRecord | null> => {
  const headers = getAuthHeaders();
  if (!headers) return null;

  const { data } = await axios.get<ClubRecord>(
    `${URL_BASE}/reading-clubs/${id}`,
    {
      headers,
    }
  );
  return (data ?? null) as ClubRecord | null;
};

export const updateReadingClub = async (
  id: string | number,
  clubData: Record<string, Serializable | undefined | null>
): Promise<ClubRecord | null> => {
  const headers = getAuthHeaders();
  if (!headers) return null;

  const payload = sanitizePayload(clubData);
  const { data } = await axios.patch<ClubRecord>(
    `${URL_BASE}/reading-clubs/${id}`,
    payload,
    {
      headers,
    }
  );
  return (data ?? null) as ClubRecord | null;
};

export const deleteReadingClub = async (
  id: string | number
): Promise<ClubRecord | null> => {
  const headers = getAuthHeaders();
  if (!headers) return null;

  const { data } = await axios.delete<ClubRecord>(
    `${URL_BASE}/reading-clubs/${id}`,
    {
      headers,
    }
  );
  return (data ?? null) as ClubRecord | null;
};

export const joinReadingClub = async (
  clubId: string | number,
  userId: string | number
): Promise<ClubRecord | null> => {
  const headers = getAuthHeaders();
  if (!headers) return null;

  const { data } = await axios.post<ClubRecord>(
    `${URL_BASE}/reading-clubs/${clubId}/join/${userId}`,
    {},
    {
      headers,
    }
  );
  return (data ?? null) as ClubRecord | null;
};

export const startDebate = async (
  clubId: string | number,
  debateData: Record<string, Serializable | undefined | null>
): Promise<ClubRecord | null> => {
  const headers = getAuthHeaders();
  if (!headers) return null;

  const payload = sanitizePayload(debateData);
  const { data } = await axios.post<ClubRecord>(
    `${URL_BASE}/reading-clubs/${clubId}/debates`,
    payload,
    {
      headers,
    }
  );
  return (data ?? null) as ClubRecord | null;
};

export const addDebateMessage = async (
  debateId: string | number,
  messageData: Record<string, Serializable | undefined | null>
): Promise<ClubRecord | null> => {
  const headers = getAuthHeaders();
  if (!headers) return null;

  const payload = sanitizePayload(messageData);
  const { data } = await axios.post<ClubRecord>(
    `${URL_BASE}/reading-clubs/debates/${debateId}/messages`,
    payload,
    {
      headers,
    }
  );
  return (data ?? null) as ClubRecord | null;
};

export const isModerator = async (
  clubId: string | number
): Promise<boolean | ClubRecord | null> => {
  const headers = getAuthHeaders();
  if (!headers) return null;

  const { data } = await axios.get<boolean | ClubRecord>(
    `${URL_BASE}/reading-clubs/moderator/${clubId}`,
    {
      headers,
    }
  );
  return data ?? null;
};
