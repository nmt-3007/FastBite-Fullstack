import axios from 'axios';

// Tạo instance riêng cho Admin
const axiosAdmin = axios.create({
  // 👇 SỬA QUAN TRỌNG: Điền trực tiếp địa chỉ Backend vào đây
  // (Lưu ý: Nếu Swagger của bạn chạy cổng khác 5010 thì nhớ sửa số này)
  baseURL: 'http://localhost:5010/api', 
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, 
});

// --- 1. INTERCEPTOR REQUEST: Tự động gắn Token ---
axiosAdmin.interceptors.request.use(
  (config) => {
    // Lấy token từ LocalStorage
    const token = localStorage.getItem('accessToken'); 
    
    if (token) {
      // Gắn token vào Header
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// --- 2. INTERCEPTOR RESPONSE: Xử lý dữ liệu & Lỗi ---
axiosAdmin.interceptors.response.use(
  (response) => {
    // Trả về thẳng data để code gọn
    return response.data;
  },
  (error) => {
    // Nếu có lỗi từ phía Server
    if (error.response) {
      const { status } = error.response;

      // 401: Hết hạn token -> Đá về Login
      if (status === 401) {
        console.warn("⚠️ Token hết hạn hoặc không hợp lệ!");
        localStorage.removeItem('user');
        localStorage.removeItem('accessToken');
        window.location.href = '/login'; 
      }

      // 403: Không có quyền
      if (status === 403) {
        alert("⛔ Bạn không có quyền truy cập trang quản trị!");
        window.location.href = '/'; 
      }
    }
    
    return Promise.reject(error);
  }
);

export default axiosAdmin;