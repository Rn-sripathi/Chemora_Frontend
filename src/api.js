import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8000/api',
});

export const processQuery = async (query) => {
    try {
        const response = await api.post('/process', { query });
        return response.data;
    } catch (error) {
        console.error("API Error:", error);
        throw error;
    }
};
