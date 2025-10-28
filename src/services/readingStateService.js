import axios from "axios";
import { URL_BASE } from "../constants/global";

export const createReadingState = async (readingStateData) => {
    const token = localStorage.getItem("token");
    if (!token) return null;

    const { data } = await axios.post(`${URL_BASE}/reading-states`, readingStateData, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return data;
};

export const getAllReadingStates = async () => {
    const token = localStorage.getItem("token");
    if (!token) return null;

    const { data } = await axios.get(`${URL_BASE}/reading-states`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return data;
};

export const getReadingStatesByUser = async (userId) => {
    const token = localStorage.getItem("token");
    if (!token) return null;

    const { data } = await axios.get(`${URL_BASE}/reading-states/user/${userId}`,{
        headers: { Authorization: `Bearer ${token}` },
    });
    return data;
};

export const updateReadingState = async (id, updateData) => {
    const token = localStorage.getItem("token");
    if (!token) return null;

    const { data } = await axios.patch(`${URL_BASE}/reading-states/${id}`,updateData,{
        headers: { Authorization: `Bearer ${token}` },
    });
    return data;
};

export const deleteReadingState = async (id) => {
    const token = localStorage.getItem("token");
    if (!token) return null;
    
    const { data } = await axios.delete(`${URL_BASE}/api/v1/reading-states/${id}`,{
        headers: { Authorization: `Bearer ${token}` },
    });
    return data;
};

