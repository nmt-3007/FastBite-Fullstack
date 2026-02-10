using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AnFoodAPI.Models;
using AnFoodAPI.DTOs; // Đảm bảo bạn đã có DTOs cho request

namespace AnFoodAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class GioHangController : ControllerBase
    {
        private readonly AnshopDbContext _context;

        public GioHangController(AnshopDbContext context)
        {
            _context = context;
        }

        // 1. LẤY GIỎ HÀNG (Đã nâng cấp load Ảnh)
        [HttpGet("{maNguoiDung}")]
        public async Task<IActionResult> GetGioHang(int maNguoiDung)
        {
            var gioHang = await _context.GioHangs
                .Include(g => g.ChiTietGioHangs)
                .ThenInclude(ct => ct.MonAn)
                .ThenInclude(m => m.HinhAnhMonAns) // ✅ QUAN TRỌNG: Load thêm ảnh
                .FirstOrDefaultAsync(g => g.MaNguoiDung == maNguoiDung);

            if (gioHang == null) return Ok(new List<object>());

            var result = gioHang.ChiTietGioHangs.Select(ct => new
            {
                maMon = ct.MaMon,
                tenMon = ct.MonAn.TenMon,
                gia = ct.MonAn.Gia,
                // Lấy ảnh đầu tiên hoặc ảnh mặc định
                hinhAnh = ct.MonAn.HinhAnhMonAns.FirstOrDefault()?.DuongDan ?? "https://placehold.co/100",
                quantity = ct.SoLuong
            });

            return Ok(result);
        }

        // 2. THÊM VÀO GIỎ (Giữ nguyên logic của bạn)
        [HttpPost("Them")]
        public async Task<IActionResult> ThemVaoGio([FromBody] ThemVaoGioRequest req)
        {
            var gioHang = await _context.GioHangs.FirstOrDefaultAsync(g => g.MaNguoiDung == req.MaNguoiDung);
            if (gioHang == null)
            {
                gioHang = new GioHang { MaNguoiDung = req.MaNguoiDung, NgayTao = DateTime.Now };
                _context.GioHangs.Add(gioHang);
                await _context.SaveChangesAsync();
            }

            var chiTiet = await _context.ChiTietGioHangs
                .FirstOrDefaultAsync(ct => ct.MaGioHang == gioHang.MaGioHang && ct.MaMon == req.MaMon);

            if (chiTiet != null) chiTiet.SoLuong += req.SoLuong;
            else
            {
                chiTiet = new ChiTietGioHang { MaGioHang = gioHang.MaGioHang, MaMon = req.MaMon, SoLuong = req.SoLuong };
                _context.ChiTietGioHangs.Add(chiTiet);
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Thêm thành công" });
        }

        // 3. 🆕 CẬP NHẬT SỐ LƯỢNG (Dùng cho nút + -)
        [HttpPost("CapNhat")]
        public async Task<IActionResult> CapNhatGioHang([FromBody] ThemVaoGioRequest req)
        {
            // Tìm chi tiết giỏ hàng của user
            var chiTiet = await _context.ChiTietGioHangs
                .Include(ct => ct.GioHang)
                .FirstOrDefaultAsync(ct => ct.GioHang.MaNguoiDung == req.MaNguoiDung && ct.MaMon == req.MaMon);

            if (chiTiet == null) return NotFound("Không tìm thấy món trong giỏ");

            // Cập nhật số lượng mới
            chiTiet.SoLuong = req.SoLuong;
            if (chiTiet.SoLuong <= 0) _context.ChiTietGioHangs.Remove(chiTiet); // Nếu về 0 thì xóa luôn

            await _context.SaveChangesAsync();
            return Ok(new { message = "Cập nhật thành công" });
        }

        // 4. 🆕 XÓA MÓN ĂN (Nút thùng rác)
        [HttpDelete("Xoa/{maNguoiDung}/{maMon}")]
        public async Task<IActionResult> XoaMonKhoiGio(int maNguoiDung, int maMon)
        {
            var chiTiet = await _context.ChiTietGioHangs
                .Include(ct => ct.GioHang)
                .FirstOrDefaultAsync(ct => ct.GioHang.MaNguoiDung == maNguoiDung && ct.MaMon == maMon);

            if (chiTiet != null)
            {
                _context.ChiTietGioHangs.Remove(chiTiet);
                await _context.SaveChangesAsync();
            }
            return Ok(new { message = "Đã xóa món ăn" });
        }
    }
}