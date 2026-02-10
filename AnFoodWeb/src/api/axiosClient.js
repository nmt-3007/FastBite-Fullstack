import axios from 'axios';
import CONFIG from '../config'; // ✅ Import từ file cấu hình

const axiosClient = axios.create({
    baseURL: CONFIG.API_URL, // ✅ Luôn luôn đúng
    headers: {
        'Content-Type': 'application/json',
    },
});

axiosClient.interceptors.response.use(
    (response) => {
        if (response && response.data !== undefined) {
            return response.data;
        }
        return response;
    },
    (error) => {
        console.error("API Error:", error);
        return Promise.reject(error);
    }
);

export default axiosClient;