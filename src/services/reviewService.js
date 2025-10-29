import axios from "axios";
import { URL_BASE } from "../constants/global";

export const getReviews = async () => {
    const token = localStorage.getItem("token");
    if (!token) return null;

    const { data } = await axios.get(`${URL_BASE}/reviews`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return data;
};

export const createReview = async (review) => {
    const token = localStorage.getItem("token");
    if (!token) return null;

    const { data } = await axios.post(`${URL_BASE}/reviews`, review, {
        headers: { Authorization: `Bearer ${token}` },
    });

    return data;
};

export const getReviewById = async (id) => {
    const token = localStorage.getItem("token");
    if (!token) return null;

    const { data } = await axios.get(`${URL_BASE}/reviews/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return data;
};

export const getReviewsByBook = async (bookId) => {
    const token = localStorage.getItem("token");
    if (!token) return null;

    const { data } = await axios.get(`${URL_BASE}/reviews/book/${bookId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return data;
};

export const updateReview = async (id, review) => {
    const token = localStorage.getItem("token");
    if (!token) return null;

    const { data } = await axios.put(`${URL_BASE}/reviews/${id}`, review, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return data;
};

export const deleteReview = async (id) => {
    const token = localStorage.getItem("token");
    if (!token) return null;

    await axios.delete(`${URL_BASE}/reviews/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`Review ${id} eliminada correctamente`);
    return true;
};