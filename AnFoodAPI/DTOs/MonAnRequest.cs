using Microsoft.AspNetCore.Http; // 👈 Bắt buộc có dòng này để dùng IFormFile

namespace AnFoodAPI.DTOs
{
    public class MonAnRequest
    {
        public string TenMon { get; set; }
        public decimal Gia { get; set; }
        public string MoTa { get; set; }

        // Mặc định món ăn nhanh là 1, đồ uống là 2
        public int MaDanhMuc { get; set; }

        // IFormFile là kiểu dữ liệu đặc biệt để nhận file từ Client
        // Dấu ? nghĩa là có thể null (dùng cho trường hợp update không đổi ảnh)
        public IFormFile? HinhAnh { get; set; }
    }
}