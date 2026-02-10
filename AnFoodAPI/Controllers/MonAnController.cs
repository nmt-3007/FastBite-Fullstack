using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AnFoodAPI.Models;
using AnFoodAPI.DTOs;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;
using System;

namespace AnFoodAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MonAnController : ControllerBase
    {
        private readonly AnshopDbContext _context;
        private readonly IWebHostEnvironment _env;

        public MonAnController(AnshopDbContext context, IWebHostEnvironment env)
        {
            _context = context;
            _env = env;
        }

        // --- 1. LẤY CHI TIẾT ---
        [HttpGet("{id}")]
        public async Task<ActionResult<MonAnDTO>> GetMonAn(int id)
        {
            var monAn = await _context.MonAns 
                .Include(m => m.HinhAnhMonAns)
                .Include(m => m.MaDanhMucNavigation)
                // 👇 THÊM ĐIỀU KIỆN: Không lấy món đã xóa
                .FirstOrDefaultAsync(m => m.MaMon == id && !m.IsDeleted);

            if (monAn == null) return NotFound(new { message = "Không tìm thấy món ăn" });

            // Tính số lượng đã bán
            var soLuongDaBan = await _context.ChiTietDonHangs
                .Include(ct => ct.DonHang)
                .Where(ct => ct.MaMon == id && ct.DonHang.TrangThai != "DaHuy" && ct.DonHang.TrangThai != "huy") 
                .SumAsync(ct => (int?)ct.SoLuong) ?? 0;

            var result = new MonAnDTO
            {
                MaMon = monAn.MaMon,
                TenMon = monAn.TenMon,
                Gia = monAn.Gia,
                MoTa = monAn.MoTa,
                HinhAnh = !string.IsNullOrEmpty(monAn.HinhAnh) 
                          ? monAn.HinhAnh 
                          : monAn.HinhAnhMonAns.Select(h => h.DuongDan).FirstOrDefault(),
                
                HinhAnhMonAns = monAn.HinhAnhMonAns,
                DaBan = soLuongDaBan,
                TenDanhMuc = monAn.MaDanhMucNavigation?.TenDanhMuc 
            };

            return Ok(result);
        }

        // --- 2. LẤY DANH SÁCH THEO DANH MỤC ---
        [HttpGet("ByCategory/{maDm}")]
        public async Task<ActionResult<IEnumerable<MonAnDTO>>> GetMonAnsByCategory(int maDm)
        {
            var list = await _context.MonAns
                // 👇 THÊM ĐIỀU KIỆN: !m.IsDeleted
                .Where(m => m.MaDanhMuc == maDm && m.TrangThai != "ngung_ban" && !m.IsDeleted)
                .Include(m => m.HinhAnhMonAns)
                .Select(m => new MonAnDTO
                {
                    MaMon = m.MaMon,
                    TenMon = m.TenMon,
                    Gia = m.Gia,
                    MoTa = m.MoTa,
                    HinhAnh = !string.IsNullOrEmpty(m.HinhAnh) 
                              ? m.HinhAnh 
                              : m.HinhAnhMonAns.Select(h => h.DuongDan).FirstOrDefault(),
                    HinhAnhMonAns = m.HinhAnhMonAns,
                    DaBan = 0 
                })
                .ToListAsync();

            return Ok(list);
        }

        // --- 3. LẤY TOÀN BỘ (SỬA ĐỂ LẤY CẢ MÓN ĐÃ XÓA CHO ADMIN) ---
        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetAll()
        {
            var list = await _context.MonAns
                // 👇 BỎ điều kiện !m.IsDeleted để lấy hết
                .Include(m => m.HinhAnhMonAns)
                .Include(m => m.MaDanhMucNavigation)
                .OrderByDescending(m => m.NgayTao)
                .Select(m => new
                {
                    m.MaMon,
                    m.TenMon,
                    m.Gia,
                    m.MoTa,
                    m.TonKho,
                    m.TrangThai,
                    // 👇 Trả về cờ đã xóa để Frontend biết
                    IsDeleted = m.IsDeleted, 
                    HinhAnh = !string.IsNullOrEmpty(m.HinhAnh) 
                              ? m.HinhAnh 
                              : m.HinhAnhMonAns.Select(h => h.DuongDan).FirstOrDefault(),
                    MaDanhMuc = m.MaDanhMuc,
                    TenDanhMuc = m.MaDanhMucNavigation != null ? m.MaDanhMucNavigation.TenDanhMuc : "Chưa phân loại"
                })
                .ToListAsync();

            return Ok(list);
        }

        // --- 7. KHÔI PHỤC MÓN (RESTORE) ---
        [HttpPut("Restore/{id}")]
        public async Task<IActionResult> Restore(int id)
        {
            var mon = await _context.MonAns.FindAsync(id);
            if (mon == null) return NotFound("Không tìm thấy món");

            mon.IsDeleted = false; // Sống lại
            mon.TrangThai = "con_ban"; // Mở bán lại
            await _context.SaveChangesAsync();

            return Ok(new { message = "Đã khôi phục món ăn thành công!" });
        }

        // --- 4. THÊM MÓN MỚI (Giữ nguyên) ---
        [HttpPost]
        public async Task<IActionResult> Create([FromForm] MonAnRequest req)
        {
            try
            {
                var monAn = new MonAn
                {
                    TenMon = req.TenMon,
                    Gia = req.Gia,
                    MoTa = req.MoTa,
                    MaDanhMuc = req.MaDanhMuc,
                    TrangThai = "con_ban",
                    NgayTao = DateTime.Now,
                    IsDeleted = false // Mặc định là chưa xóa
                };
                
                if (req.HinhAnh != null)
                {
                    var folderPath = Path.Combine(_env.WebRootPath, "images");
                    if (!Directory.Exists(folderPath)) Directory.CreateDirectory(folderPath);
                    var uniqueFileName = $"{Guid.NewGuid()}{Path.GetExtension(req.HinhAnh.FileName)}";
                    var filePath = Path.Combine(folderPath, uniqueFileName);
                    using (var stream = new FileStream(filePath, FileMode.Create))
                    {
                        await req.HinhAnh.CopyToAsync(stream);
                    }
                    monAn.HinhAnh = $"/images/{uniqueFileName}";
                }

                _context.MonAns.Add(monAn);
                await _context.SaveChangesAsync();

                if (!string.IsNullOrEmpty(monAn.HinhAnh))
                {
                    _context.HinhAnhMonAns.Add(new HinhAnhMonAn
                    {
                        MaMon = monAn.MaMon,
                        DuongDan = monAn.HinhAnh,
                        NgayTao = DateTime.Now
                    });
                    await _context.SaveChangesAsync();
                }

                return Ok(new { message = "Thêm món thành công!", data = monAn });
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Lỗi thêm món: " + ex.Message);
            }
        }

        // --- 5. CẬP NHẬT (Giữ nguyên) ---
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromForm] MonAnRequest req)
        {
            try
            {
                var monAn = await _context.MonAns.Include(m => m.HinhAnhMonAns).FirstOrDefaultAsync(m => m.MaMon == id);
                if (monAn == null) return NotFound("Không tìm thấy món cần sửa");

                monAn.TenMon = req.TenMon;
                monAn.Gia = req.Gia;
                monAn.MoTa = req.MoTa;
                monAn.MaDanhMuc = req.MaDanhMuc;

                if (req.HinhAnh != null)
                {
                    var folderPath = Path.Combine(_env.WebRootPath, "images");
                    if (!Directory.Exists(folderPath)) Directory.CreateDirectory(folderPath);
                    var uniqueFileName = $"{Guid.NewGuid()}{Path.GetExtension(req.HinhAnh.FileName)}";
                    var filePath = Path.Combine(folderPath, uniqueFileName);
                    using (var stream = new FileStream(filePath, FileMode.Create))
                    {
                        await req.HinhAnh.CopyToAsync(stream);
                    }
                    monAn.HinhAnh = $"/images/{uniqueFileName}";

                    if (monAn.HinhAnhMonAns.Any())
                        _context.HinhAnhMonAns.RemoveRange(monAn.HinhAnhMonAns);

                    _context.HinhAnhMonAns.Add(new HinhAnhMonAn
                    {
                        MaMon = monAn.MaMon,
                        DuongDan = monAn.HinhAnh,
                        NgayTao = DateTime.Now
                    });
                }

                await _context.SaveChangesAsync();
                return Ok(new { message = "Cập nhật thành công!" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Lỗi cập nhật: " + ex.Message);
            }
        }

        // --- 6. XÓA MỀM (SOFT DELETE) - ĐÃ SỬA ---
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                var mon = await _context.MonAns.FindAsync(id);
                if (mon == null) return NotFound("Không tìm thấy món");

                // 👇 LOGIC MỚI: Chỉ đánh dấu là đã xóa, KHÔNG BAO GIỜ XÓA DATABASE
                mon.IsDeleted = true; 
                mon.TrangThai = "ngung_ban"; // Cập nhật trạng thái để chắc chắn không hiện lên

                // Xóa khỏi giỏ hàng của khách (Cái này nên xóa thật để giỏ hàng sạch)
                var cartItems = _context.ChiTietGioHangs.Where(c => c.MaMon == id); 
                _context.ChiTietGioHangs.RemoveRange(cartItems);

                await _context.SaveChangesAsync();

                return Ok(new { message = "Đã xóa món ăn thành công (Dữ liệu được bảo lưu trong hệ thống)." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Lỗi khi xóa: " + ex.Message);
            }
        }
    }
}