import axios from 'axios';
import CONFIG from '../config'; // Import từ file config của sếp

const axiosClient = axios.create({
    baseURL: CONFIG.API_URL, // Tự động lấy link từ config (Vercel/Railway)
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000, // Giữ timeout 30s để tránh treo request
});

// --- 1. INTERCEPTOR REQUEST: Tự động gắn Token cho mọi request ---
axiosClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// --- 2. INTERCEPTOR RESPONSE: Xử lý dữ liệu & Lỗi tập trung ---
axiosClient.interceptors.response.use(
    (response) => {
        // Trả về thẳng data để code gọn
        return response.data !== undefined ? response.data : response;
    },
    (error) => {
        if (error.response) {
            const { status } = error.response;

            // 401: Hết hạn token -> Đá về Login
            if (status === 401) {
                console.warn("⚠️ Token hết hạn!");
                localStorage.removeItem('user');
                localStorage.removeItem('accessToken');
                window.location.href = '/login';
            }

            // 403: Không có quyền
            if (status === 403) {
                alert("⛔ Bạn không có quyền truy cập!");
                window.location.href = '/';
            }
        }
        console.error("API Error:", error);
        return Promise.reject(error);
    }
);

export default axiosClient;