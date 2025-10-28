import axios from "axios";
import { URL_BASE } from "../constants/global";

export const getAllBooks = async () => {
    const { data } = await axios.get(`${URL_BASE}/books`);
    return data;
};

export const getBookByTitle = async (title) => {
    const { data } = await axios.get(`${URL_BASE}/books/title/${title}`);
    return data;
};

export const getBookById = async (id) => {
    const { data } = await axios.get(`${URL_BASE}/books/${id}`);
    return data;
};

export const createBook = async (bookData) => {
    const token = localStorage.getItem("token");
    if (!token) return null;

    const { data } = await axios.post(`${URL_BASE}/books`, bookData, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return data;
};

export const updateBook = async (title, updateData) => {
    const token = localStorage.getItem("token");
    if (!token) return null;

    const { data } = await axios.put(`${URL_BASE}/books/${title}`, updateData, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return data;
};

export const deleteBook = async (title) => {
    const token = localStorage.getItem("token");
    if (!token) return null;

    const { data } = await axios.delete(`${URL_BASE}/books/${title}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return data;
};


export const searchGoogleBooks = async (params) => {
    const { data } = await axios.get(`${URL_BASE}/books/search`, { params });
    return data;
};


export const importFromGoogle = async (googleData) => {
    const token = localStorage.getItem("token");
    if (!token) return null;

    const { data } = await axios.post(`${URL_BASE}/books/import`, googleData, { headers });
    return data;
};