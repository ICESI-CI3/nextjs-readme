import apiClient, { resolveAuthToken } from "./apiClient";

export type AuthUser = {
  id?: string | number;
  name?: string;
  email?: string;
  role?: string;
  username?: string;
  [key: string]: unknown;
};

type UserInput = Partial<{
  name: string;
  fullName: string;
  username: string;
  userName: string;
  email: string;
  password: string;
  role: string;
}> &
  Record<string, unknown>;

type UserDefaults = Partial<{
  name: string;
  username: string;
  email: string;
  password: string;
  role: string;
}>;

type UserPayload = {
  username: string;
  email: string;
  password: string;
  role: string;
  name?: string;
};

type AuthResponse = {
  token?: string;
  user?: AuthUser | null;
  [key: string]: unknown;
};

type ApiUserResponse = AuthUser | AuthUser[] | { user?: AuthUser | null };

const toPathSegment = (value: string | number): string =>
  encodeURIComponent(String(value));

const buildUserPayload = (
  userData: UserInput,
  defaults: UserDefaults = {}
): UserPayload => {
  const rawName = userData.name ?? userData.fullName ?? defaults.name;
  const name = typeof rawName === "string" ? rawName : undefined;

  const usernameCandidate =
    userData.username ??
    userData.userName ??
    defaults.username ??
    (name ? name.replace(/\s+/g, "").toLowerCase() : undefined);

  const emailCandidate = userData.email ?? defaults.email;
  const passwordCandidate = userData.password ?? defaults.password;
  const roleCandidate = userData.role ?? defaults.role ?? "reader";

  const email =
    typeof emailCandidate === "string" ? emailCandidate.trim() : undefined;
  const password =
    typeof passwordCandidate === "string" ? passwordCandidate : undefined;
  const role =
    typeof roleCandidate === "string"
      ? roleCandidate.trim().toLowerCase()
      : "reader";

  const resolvedUsernameRaw =
    typeof usernameCandidate === "string"
      ? usernameCandidate
      : email
        ? email.split("@")[0]
        : undefined;

  const resolvedUsername = resolvedUsernameRaw
    ? resolvedUsernameRaw.trim().toLowerCase().replace(/\s+/g, "")
    : undefined;

  if (!resolvedUsername || !email || !password) {
    throw new Error(
      "Missing required user fields (username, email, or password)."
    );
  }

  const payload: UserPayload = {
    username: resolvedUsername,
    email,
    password,
    role: role || "reader",
  };

  if (name) {
    payload.name = name;
  }

  return payload;
};

export const registerUser = async (
  userData: UserInput
): Promise<ApiUserResponse> => {
  const payload = buildUserPayload(userData);
  const res = await apiClient.post<ApiUserResponse>(
    '/users/register',
    payload
  );
  console.log("User registered:", res.data);
  return res.data;
};

export const loginUser = async (
  credentials: Record<string, unknown>
): Promise<AuthResponse> => {
  const res = await apiClient.post<AuthResponse>(
    '/users/login',
    credentials
  );
  const token = res.data.token;
  console.log("User logged in:", res.data);

  if (typeof window !== "undefined" && typeof token === "string") {
    localStorage.setItem("token", token);
  }

  return res.data;
};

export const logoutUser = async (): Promise<unknown | null> => {
  const token = resolveAuthToken();
  if (!token) return null;

  const res = await apiClient.post('/users/logout', null);
  console.log("User logged out:", res.data);
  return res.data;
};

export const getUsers = async (): Promise<
  AuthUser[] | AuthUser | null
> => {
  const token = resolveAuthToken();
  if (!token) return null;

  const res = await apiClient.get<AuthUser[] | AuthUser>('/users');
  console.log("Users:", res.data);
  return res.data;
};

export const getProfile = async (): Promise<
  AuthUser | { user?: AuthUser | null } | null
> => {
  const token = resolveAuthToken();
  if (!token) return null;

  const res = await apiClient.get<AuthUser | { user?: AuthUser | null }>(
    '/users/me'
  );
  console.log("Profile:", res.data);
  return res.data;
};

export const createUser = async (
  userData: UserInput
): Promise<ApiUserResponse | null> => {
  const token = resolveAuthToken();
  if (!token) return null;

  const payload = buildUserPayload(userData, { role: "reader" });

  const res = await apiClient.post<ApiUserResponse>(
    '/users/admin/register',
    payload
  );
  console.log("User created:", res.data);
  return res.data;
};

export const updateUser = async (
  id: string | number,
  userData: Record<string, unknown>
): Promise<ApiUserResponse | null> => {
  const token = resolveAuthToken();
  if (!token) return null;

  const payload: Record<string, unknown> = { ...userData };

  const incomingRole = payload.role;
  if (typeof incomingRole === "string") {
    const normalizedRole = incomingRole.trim().toLowerCase();
    if (normalizedRole === "moderator") {
      payload.role = "reader";
    } else if (normalizedRole === "admin" || normalizedRole === "reader") {
      payload.role = normalizedRole;
    } else {
      delete payload.role;
    }
  } else if (incomingRole !== undefined) {
    delete payload.role;
  }

  const res = await apiClient.put<ApiUserResponse>(
    `/users/${toPathSegment(id)}`,
    payload
  );
  console.log("User updated:", res.data);
  return res.data;
};

export const deleteUser = async (
  id: string | number
): Promise<ApiUserResponse | null> => {
  const token = resolveAuthToken();
  if (!token) return null;

  const res = await apiClient.delete<ApiUserResponse>(
    `/users/${toPathSegment(id)}`
  );
  console.log("User deleted:", res.data);
  return res.data;
};
