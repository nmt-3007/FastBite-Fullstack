using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema; // 👈 1. QUAN TRỌNG: Để dùng [ForeignKey]

namespace AnFoodAPI.Models
{
    public partial class ChiTietGioHang
    {
        public int MaChiTietGio { get; set; }

        public int? MaGioHang { get; set; }

        public int? MaMon { get; set; }

        public int? SoLuong { get; set; }

        // 👇 2. CHỈ ĐỊNH KHÓA NGOẠI RÕ RÀNG CHO GIỎ HÀNG
        [ForeignKey("MaGioHang")]
        [System.Text.Json.Serialization.JsonIgnore]
        public virtual GioHang? GioHang { get; set; }

        // 👇 3. CHỈ ĐỊNH KHÓA NGOẠI RÕ RÀNG CHO MÓN ĂN
        [ForeignKey("MaMon")]
        public virtual MonAn? MonAn { get; set; }
    }
}