import axios from "axios";
import { URL_BASE } from "../constants/global";


const buildUserPayload = (userData, defaults = {}) => {
  const name = userData.name ?? userData.fullName ?? defaults.name;
  const username =
    userData.username ??
    userData.userName ??
    defaults.username ??
    (name ? name.replace(/\s+/g, '').toLowerCase() : undefined);

  const email = userData.email ?? defaults.email;
  const password = userData.password ?? defaults.password;
  const role = userData.role ?? defaults.role ?? 'reader';

  const resolvedUsernameRaw =
    username ??
    (typeof email === 'string' ? email.split('@')[0] : undefined);
  const resolvedUsername = resolvedUsernameRaw
    ? String(resolvedUsernameRaw).trim().toLowerCase().replace(/\s+/g, '')
    : undefined;

  const payload = {
    username: resolvedUsername,
    email,
    password,
    role,
  };

  if (name) {
    payload.name = name;
  }

  if (!payload.username || !payload.email || !payload.password) {
    throw new Error('Missing required user fields (username, email, or password).');
  }

  return payload;
};

export const registerUser = async (userData) => {
  const payload = buildUserPayload(userData);
  const res = await axios.post(`${URL_BASE}/users/register`, payload);
  console.log("User registered:", res.data);
  return res.data;
};

export const loginUser = async (credentials) => {
  const res = await axios.post(`${URL_BASE}/users/login`, credentials);
  const token = res.data.token;
  console.log("User logged in:", res.data);

  // Save the token in localStorage
  if (typeof window !== "undefined") {
    localStorage.setItem("token", token);
  }

  return res.data;
};

export const getUsers = async () => {
    const token = localStorage.getItem("token");
    if (!token) return null;

    const res = await axios.get(`${URL_BASE}/users`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    console.log("Users:", res.data);
    return res.data;
};

export const getProfile = async () => {
    const token = localStorage.getItem("token");
    if (!token) return null;

    const res = await axios.get(`${URL_BASE}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    console.log("Profile:", res.data);
    return res.data;
};

export const createUser = async (userData) => {
    const token = localStorage.getItem("token");
    if (!token) return null;

    const payload = buildUserPayload(userData, { role: 'reader' });

    const res = await axios.post(`${URL_BASE}/users`, payload, {
        headers: { Authorization: `Bearer ${token}` },
    });
    console.log("User created:", res.data);
    return res.data;
};

export const updateUser = async (id, userData) => {
    const token = localStorage.getItem("token");
    if (!token) return null;

    const res = await axios.put(`${URL_BASE}/users/${id}`, userData, {
        headers: { Authorization: `Bearer ${token}` },
    });
    console.log("User updated:", res.data);
    return res.data;
};

export const deleteUser = async (id) => {
    const token = localStorage.getItem("token");
    if (!token) return null;
    
    const res = await axios.delete(`${URL_BASE}/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    console.log("User deleted:", res.data);
    return res.data;
};
