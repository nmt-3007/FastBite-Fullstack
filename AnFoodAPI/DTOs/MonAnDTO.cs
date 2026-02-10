using AnFoodAPI.Models; // 👈 Quan trọng để dùng HinhAnhMonAn

namespace AnFoodAPI.DTOs
{
    public class MonAnDTO
    {
        public int MaMon { get; set; }
        public string TenMon { get; set; } = null!;
        public decimal Gia { get; set; }
        public string? MoTa { get; set; }
        public string? HinhAnh { get; set; }

        // 👇 ĐỪNG XÓA DÒNG NÀY (Controller cần dùng để lọc món theo danh mục)
        public int? MaDanhMuc { get; set; } 

        // 👇 Dòng bạn vừa thêm (Đúng rồi, để fix lỗi hiển thị tên)
        public string? TenDanhMuc { get; set; } 

        public int DaBan { get; set; }
        public ICollection<HinhAnhMonAn> HinhAnhMonAns { get; set; }
    }
}