using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AnFoodAPI.Models;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System;

namespace AnFoodAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DonHangController : ControllerBase
    {
        private readonly AnshopDbContext _context;

        public DonHangController(AnshopDbContext context)
        {
            _context = context;
        }

        // ============================================================
        // 1. TẠO ĐƠN HÀNG (ĐÃ FIX LỖI KHÓA NGOẠI XÓA GIỎ HÀNG)
        // ============================================================
        [HttpPost("TaoDon")]
        public async Task<IActionResult> TaoDon([FromBody] TaoDonRequest req)
        {
            if (req.ChiTietDonHangs == null || !req.ChiTietDonHangs.Any())
                return BadRequest(new { message = "Giỏ hàng trống!" });

            // Dùng Transaction để đảm bảo an toàn dữ liệu
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // 1. Tạo Đơn Hàng
                var donHang = new DonHang
                {
                    MaNguoiDung = req.MaNguoiDung,
                    NguoiNhan = req.NguoiNhan,
                    SoDienThoai = req.SoDienThoai,
                    DiaChiGiaoHang = req.DiaChiGiaoHang,
                    GhiChu = req.GhiChu,
                    TongTien = req.TongTien,
                    NgayDat = DateTime.UtcNow.AddHours(7), // Giờ VN
                    TrangThai = "cho_xu_ly"
                };

                _context.DonHangs.Add(donHang);
                await _context.SaveChangesAsync(); // Lưu để có ID đơn hàng

                // 2. Lưu Chi Tiết Đơn Hàng
                foreach (var item in req.ChiTietDonHangs)
                {
                    var chiTiet = new ChiTietDonHang
                    {
                        MaDonHang = donHang.MaDonHang,
                        MaMon = item.MaMonAn,
                        SoLuong = item.SoLuong,
                        DonGia = item.GiaBan 
                    };
                    _context.ChiTietDonHangs.Add(chiTiet);
                }

                // 3. Lưu Thông Tin Thanh Toán
                var phuongThuc = (req.GhiChu != null && req.GhiChu.ToUpper().Contains("VNPAY")) ? "VNPAY" : "COD";
                var thanhToan = new ThanhToan
                {
                    MaDonHang = donHang.MaDonHang,
                    SoTien = (double)req.TongTien, 
                    NgayThanhToan = DateTime.UtcNow.AddHours(7),
                    PhuongThuc = phuongThuc,
                    TrangThai = (phuongThuc == "VNPAY") ? "success" : "pending"
                };
                _context.ThanhToans.Add(thanhToan);

                // 👇👇👇 4. QUAN TRỌNG: SỬA LỖI XÓA GIỎ HÀNG (DELETE CHILD FIRST) 👇👇👇
                
                // A. Tìm các Giỏ hàng của user
                var gioHangs = await _context.GioHangs
                    .Where(g => g.MaNguoiDung == req.MaNguoiDung)
                    .ToListAsync();

                if (gioHangs.Any())
                {
                    // B. Lấy danh sách ID của các giỏ hàng này
                    var listMaGioHang = gioHangs.Select(g => g.MaGioHang).ToList();

                    // C. Tìm các Chi Tiết Giỏ Hàng (Con) thuộc về các giỏ hàng trên
                    // Lưu ý: Cần kiểm tra đúng tên DbSet trong Context, thường là ChiTietGioHangs
                    var chiTietCanXoa = await _context.ChiTietGioHangs
                        .Where(ct => ct.MaGioHang != null && listMaGioHang.Contains(ct.MaGioHang.Value))
                        .ToListAsync();

                    // D. Xóa CON trước
                    if (chiTietCanXoa.Any())
                    {
                        _context.ChiTietGioHangs.RemoveRange(chiTietCanXoa);
                    }

                    // E. Xóa CHA sau
                    _context.GioHangs.RemoveRange(gioHangs);
                }
                // 👆👆👆 HẾT PHẦN FIX LỖI 👆👆👆

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new { message = "Đặt hàng thành công!", maDonHang = donHang.MaDonHang });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                Console.WriteLine("LỖI TẠO ĐƠN: " + ex.ToString());
                // Trả về lỗi chi tiết để dễ debug
                return StatusCode(500, new { message = "Lỗi Server: " + ex.InnerException?.Message ?? ex.Message });
            }
        }

        // ============================================================
        // 2. LẤY TẤT CẢ ĐƠN (CHO ADMIN)
        // ============================================================
        [HttpGet]
        public async Task<IActionResult> GetAllDonHangs()
        {
            var list = await _context.DonHangs
                .OrderByDescending(d => d.NgayDat)
                .Select(d => new 
                {
                    d.MaDonHang,
                    d.NguoiNhan,        
                    d.SoDienThoai,
                    d.DiaChiGiaoHang,
                    d.TongTien,
                    d.TrangThai,
                    d.NgayDat,
                    d.GhiChu,
                    NguoiDung = d.NguoiDung == null ? null : new {
                        d.NguoiDung.MaNguoiDung,
                        d.NguoiDung.HoTen,
                        d.NguoiDung.Email,
                        d.NguoiDung.SoDienThoai
                    },
                    ChiTietDonHangs = d.ChiTietDonHangs.Select(ct => new {
                        ct.MaChiTiet,
                        ct.SoLuong,
                        ct.DonGia,
                        ct.MaMon,
                        MonAn = ct.MonAn == null ? null : new {
                            ct.MonAn.TenMon,
                            HinhAnh = ct.MonAn.HinhAnhMonAns.FirstOrDefault() != null 
                                ? ct.MonAn.HinhAnhMonAns.FirstOrDefault().DuongDan 
                                : null
                        }
                    }).ToList()
                })
                .ToListAsync();

            return Ok(list);
        }

        // ============================================================
        // 3. CẬP NHẬT TRẠNG THÁI ĐƠN HÀNG
        // ============================================================
        [HttpPut("CapNhatTrangThai/{id}")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] string trangThaiMoi)
        {
            var donHang = await _context.DonHangs.FindAsync(id);
            if (donHang == null) return NotFound(new { message = "Không tìm thấy đơn hàng!" });

            donHang.TrangThai = trangThaiMoi;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Cập nhật thành công!" });
        }

        // ============================================================
        // 4. LỊCH SỬ ĐƠN HÀNG (CHO KHÁCH HÀNG)
        // ============================================================
        [HttpGet("LichSu/{maNguoiDung}")]
        public async Task<IActionResult> GetLichSuDonHang(int maNguoiDung)
        {
            var history = await _context.DonHangs
                .Where(d => d.MaNguoiDung == maNguoiDung)
                .OrderByDescending(d => d.NgayDat)
                .Select(d => new
                {
                    d.MaDonHang,
                    d.NgayDat,
                    d.TongTien,
                    d.TrangThai,
                    d.DiaChiGiaoHang, 
                    ChiTiet = d.ChiTietDonHangs.Select(ct => new
                    {
                        ct.MonAn.TenMon,
                        ct.SoLuong,
                        ct.DonGia,
                        HinhAnh = ct.MonAn.HinhAnhMonAns.FirstOrDefault() != null
                                ? ct.MonAn.HinhAnhMonAns.FirstOrDefault().DuongDan
                                : "https://placehold.co/100"
                    }).ToList()
                })
                .ToListAsync();

            return Ok(history);
        }
    }

    // DTOs
    public class TaoDonRequest
    {
        public int MaNguoiDung { get; set; }
        public string NguoiNhan { get; set; }
        public string SoDienThoai { get; set; }
        public string DiaChiGiaoHang { get; set; }
        public string GhiChu { get; set; }
        public decimal TongTien { get; set; }
        public List<ChiTietDonHangRequest> ChiTietDonHangs { get; set; }
    }

    public class ChiTietDonHangRequest
    {
        public int MaMonAn { get; set; }
        public int SoLuong { get; set; }
        public decimal GiaBan { get; set; }
    }
}