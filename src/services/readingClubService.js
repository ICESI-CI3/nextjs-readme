import axios from "axios";
import { URL_BASE } from "../constants/global";

export const createReadingClub = async (clubData) => {
    const token = localStorage.getItem("token");
    if (!token) return null;

    const payload = Object.entries(clubData ?? {}).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            acc[key] = value;
        }
        return acc;
    }, {});

    const response = await axios.post(`${URL_BASE}/reading-clubs`, payload, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
};

export const getReadingClubs = async () => {
    const token = localStorage.getItem("token");
    if (!token) return null;

    const response = await axios.get(`${URL_BASE}/reading-clubs`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
};

export const getReadingClubById = async (id) => {
    const token = localStorage.getItem("token");
    if (!token) return null;

    const response = await axios.get(`${URL_BASE}/reading-clubs/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
};

export const updateReadingClub = async (id, clubData) => {
    const token = localStorage.getItem("token");
    if (!token) return null;

    const response = await axios.patch(`${URL_BASE}/reading-clubs/${id}`, clubData, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
};

export const deleteReadingClub = async (id) => {
    const token = localStorage.getItem("token");
    if (!token) return null;

    const response = await axios.delete(`${URL_BASE}/reading-clubs/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
};

export const joinReadingClub = async (clubId, userId) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) return null;

    const response = await axios.post(
        `${URL_BASE}/reading-clubs/${clubId}/join/${userId}`,
        {},
        {
            headers: { Authorization: `Bearer ${token}` },
        },
    );
    return response.data;
};

export const startDebate = async (clubId, debateData) => {
    const token = localStorage.getItem("token");
    if (!token) return null;

    const response = await axios.post(`${URL_BASE}/reading-clubs/${clubId}/debates`, debateData, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
};

export const addDebateMessage = async (debateId, messageData) => {
    const token = localStorage.getItem("token");
    if (!token) return null;

    const response = await axios.post(`${URL_BASE}/reading-clubs/debates/${debateId}/messages`, messageData, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
};

export const isModerator = async (clubId) => {
    const token = localStorage.getItem("token");
    if (!token) return null;
    
    const response = await axios.get(`${URL_BASE}/reading-clubs/moderator/${clubId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
};

