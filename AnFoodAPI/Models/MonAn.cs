using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AnFoodAPI.Models
{
    [Table("mon_an")]
    public partial class MonAn
    {
        public MonAn()
        {
            ChiTietGioHangs = new HashSet<ChiTietGioHang>();
            DanhGia = new HashSet<DanhGia>();
            HinhAnhMonAns = new HashSet<HinhAnhMonAn>();
            ChiTietDonHangs = new HashSet<ChiTietDonHang>();
            
            HanhViNguoiDungs = new HashSet<HanhViNguoiDung>(); 
            YeuThiches = new HashSet<YeuThich>();
            GoiYAis = new HashSet<GoiYAi>();
        }

        [Key]
        [Column("ma_mon")]
        public int MaMon { get; set; }

        [Column("ten_mon")]
        public string TenMon { get; set; } = null!;

        [Column("gia")]
        public decimal Gia { get; set; }

        [Column("mo_ta")]
        public string? MoTa { get; set; }

        [Column("hinh_anh")]
        public string? HinhAnh { get; set; }

        [Column("ma_danh_muc")]
        public int? MaDanhMuc { get; set; }

        [Column("trang_thai")]
        public string? TrangThai { get; set; }

        [Column("ngay_tao")]
        public DateTime? NgayTao { get; set; }

        // Các cột bổ sung
        [Column("ban_chay")]
        public int? BanChay { get; set; }

        [Column("ton_kho")]
        public int? TonKho { get; set; }

        [Column("la_mon_nong")]
        public int? LaMonNong { get; set; }

        [Column("la_do_uong_mat")]
        public int? LaDoUongMat { get; set; }

        // 👇 THUỘC TÍNH MỚI CHO XÓA MỀM (Khớp với cột IsDeleted trong Database)
        [Column("IsDeleted")]
        public bool IsDeleted { get; set; } = false; 

        // --- Quan hệ ---
        [ForeignKey("MaDanhMuc")]
        public virtual DanhMuc? MaDanhMucNavigation { get; set; }

        public virtual ICollection<ChiTietGioHang> ChiTietGioHangs { get; set; }
        public virtual ICollection<ChiTietDonHang> ChiTietDonHangs { get; set; }
        public virtual ICollection<DanhGia> DanhGia { get; set; }
        public virtual ICollection<HinhAnhMonAn> HinhAnhMonAns { get; set; }
        
        public virtual ICollection<YeuThich> YeuThiches { get; set; }
        public virtual ICollection<GoiYAi> GoiYAis { get; set; }
        public virtual ICollection<HanhViNguoiDung> HanhViNguoiDungs { get; set; } 
    }
}