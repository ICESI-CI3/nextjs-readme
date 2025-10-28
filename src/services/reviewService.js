import axios from "axios";
import { URL_BASE } from "../constants/global";

export const getReviews = async () => {
    const { data } = await axios.get(`${URL_BASE}/reviews`);
    return data;
};

export const createReview = async (review) => {
    const { data } = await axios.post(`${URL_BASE}/reviews`, review);
    return data;
};

export const getReviewById = async (id) => {
    const { data } = await axios.get(`${URL_BASE}/reviews/${id}`);
    return data;
};

export const getReviewsByBook = async (bookId) => {
    const { data } = await axios.get(`${URL_BASE}/reviews/book/${bookId}`);
    return data;
};

export const updateReview = async (id, review) => {
    const { data } = await axios.put(`${URL_BASE}/reviews/${id}`, review);
    return data;
};

export const deleteReview = async (id) => {
    await axios.delete(`${URL_BASE}/reviews/${id}`);
    console.log(`Review ${id} eliminada correctamente`);
    return true;
};