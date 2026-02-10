using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AnFoodAPI.Models
{
    [Table("don_hang")] // 👈 Đảm bảo map đúng bảng
    public partial class DonHang
    {
        [Key]
        [Column("ma_don_hang")]
        public int MaDonHang { get; set; }

        [Column("ma_nguoi_dung")]
        public int? MaNguoiDung { get; set; }

        [Column("tong_tien")]
        public decimal? TongTien { get; set; }

        [Column("trang_thai")]
        public string? TrangThai { get; set; }

        [Column("ma_dia_chi")]
        public int? MaDiaChi { get; set; }

        [Column("ngay_dat", TypeName = "datetime")]
        public DateTime? NgayDat { get; set; }

        // ============================================================
        // 👇 4 THUỘC TÍNH MỚI (ĐÃ THÊM MAPPING)
        // ============================================================
        
        [Column("nguoi_nhan")] 
        public string? NguoiNhan { get; set; }

        [Column("so_dien_thoai")]
        public string? SoDienThoai { get; set; }

        [Column("dia_chi_giao_hang")]
        public string? DiaChiGiaoHang { get; set; }

        [Column("ghi_chu")]
        public string? GhiChu { get; set; }

        // ============================================================
        // 👇 CÁC MỐI NỐI (NAVIGATION PROPERTIES)
        // ============================================================

        [ForeignKey("MaNguoiDung")]
        // Không cần InverseProperty nếu bên NguoiDung.cs đã xóa nó
        public virtual NguoiDung? NguoiDung { get; set; }

        [ForeignKey("MaDiaChi")]
        public virtual DiaChiGiaoHang? DiaChiGiaoHangNavigation { get; set; }

        public virtual ICollection<ChiTietDonHang> ChiTietDonHangs { get; set; } = new List<ChiTietDonHang>();

        public virtual ICollection<LichSuTrangThaiDonHang> LichSuTrangThaiDonHangs { get; set; } = new List<LichSuTrangThaiDonHang>();

        public virtual ICollection<ThanhToan> ThanhToans { get; set; } = new List<ThanhToan>();
    }
}