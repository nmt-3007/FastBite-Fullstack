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

        // =============================================================
        // 1. LẤY CHI TIẾT MÓN ĂN
        // =============================================================
        [HttpGet("{id}")]
        public async Task<ActionResult<MonAnDTO>> GetMonAn(int id)
        {
            var monAn = await _context.MonAns
                .Include(m => m.HinhAnhMonAns)
                .Include(m => m.MaDanhMucNavigation)
                .AsNoTracking()
                .FirstOrDefaultAsync(m => m.MaMon == id && !m.IsDeleted);

            if (monAn == null) 
                return NotFound(new { message = "Không tìm thấy món ăn." });

            var soLuongDaBan = await _context.ChiTietDonHangs
                .Include(ct => ct.DonHang)
                .Where(ct => ct.MaMon == id && ct.DonHang.TrangThai != "DaHuy" && ct.DonHang.TrangThai != "huy")
                .SumAsync(ct => (int?)ct.SoLuong) ?? 0;

            var loHangHienTai = await _context.ChiTietKhos
                .Where(k => k.MaMon == id && k.SoLuongHienTai > 0 && k.NgayHetHan > DateTime.Now)
                .OrderBy(k => k.NgayHetHan) 
                .ToListAsync();

            int tongTonKhoThucTe = loHangHienTai.Sum(k => k.SoLuongHienTai ?? 0);
            DateTime? hanSuDungGanNhat = loHangHienTai.FirstOrDefault()?.NgayHetHan;

            double diemTrungBinh = await _context.DanhGias
                .Where(d => d.MaMon == id)
                .AverageAsync(d => (double?)d.SoSao) ?? 0.0;

            return Ok(new MonAnDTO
            {
                MaMon = monAn.MaMon,
                TenMon = monAn.TenMon,
                GiaBan = monAn.Gia, 
                GiaVon = monAn.GiaVon ?? 0, 
                MoTa = monAn.MoTa,
                HinhAnh = !string.IsNullOrEmpty(monAn.HinhAnh) ? monAn.HinhAnh : monAn.HinhAnhMonAns?.FirstOrDefault()?.DuongDan,
                SoLuong = tongTonKhoThucTe,
                NgayHetHan = hanSuDungGanNhat,
                DaBan = soLuongDaBan,
                MaDanhMuc = monAn.MaDanhMuc,
                TenDanhMuc = monAn.MaDanhMucNavigation?.TenDanhMuc ?? "Chưa phân loại",
                HinhAnhMonAns = monAn.HinhAnhMonAns?.ToList(),
                DiemDanhGia = Math.Round(diemTrungBinh, 1) 
            });
        }

        // =============================================================
        // 2. LẤY DANH SÁCH THEO DANH MỤC
        // =============================================================
        [HttpGet("ByCategory/{maDm}")]
        public async Task<ActionResult<IEnumerable<MonAnDTO>>> GetMonAnsByCategory(int maDm)
        {
            // Bước 1: Lấy danh sách thô an toàn
            var monAns = await _context.MonAns
                .Include(m => m.HinhAnhMonAns)
                .Include(m => m.MaDanhMucNavigation)
                .Where(m => m.MaDanhMuc == maDm && m.TrangThai != "ngung_ban" && !m.IsDeleted)
                .ToListAsync();

            var list = new List<MonAnDTO>();
            
            // Bước 2: Dùng vòng lặp để EF không phải dịch lệnh SQL phức tạp
            foreach (var m in monAns)
            {
                int tonKho = await _context.ChiTietKhos.Where(k => k.MaMon == m.MaMon && k.NgayHetHan > DateTime.Now).SumAsync(k => (int?)k.SoLuongHienTai) ?? 0;
                var han = await _context.ChiTietKhos.Where(k => k.MaMon == m.MaMon && k.SoLuongHienTai > 0).OrderBy(k => k.NgayHetHan).Select(k => k.NgayHetHan).FirstOrDefaultAsync();
                double diem = await _context.DanhGias.Where(d => d.MaMon == m.MaMon).AverageAsync(d => (double?)d.SoSao) ?? 0.0;

                list.Add(new MonAnDTO
                {
                    MaMon = m.MaMon,
                    TenMon = m.TenMon,
                    GiaBan = m.Gia,
                    GiaVon = m.GiaVon ?? 0,
                    SoLuong = tonKho,
                    NgayHetHan = han,
                    MoTa = m.MoTa,
                    HinhAnh = !string.IsNullOrEmpty(m.HinhAnh) ? m.HinhAnh : m.HinhAnhMonAns?.FirstOrDefault()?.DuongDan,
                    HinhAnhMonAns = m.HinhAnhMonAns?.ToList(),
                    DaBan = m.DaBan ?? 0,
                    DiemDanhGia = Math.Round(diem, 1)
                });
            }

            return Ok(list);
        }

        // =============================================================
        // 3. LẤY TOÀN BỘ (Dùng cho Admin & Inventory)
        // =============================================================
        [HttpGet]
        public async Task<ActionResult<IEnumerable<MonAnDTO>>> GetAll()
        {
            // Bước 1: Lấy danh sách thô
            var monAns = await _context.MonAns
                .Include(m => m.HinhAnhMonAns)
                .Include(m => m.MaDanhMucNavigation)
                .Where(m => !m.IsDeleted)
                .OrderByDescending(m => m.MaMon)
                .ToListAsync();

            var list = new List<MonAnDTO>();

            // Bước 2: Xử lý an toàn từng món ăn
            foreach (var m in monAns)
            {
                int tonKho = await _context.ChiTietKhos.Where(k => k.MaMon == m.MaMon && k.NgayHetHan > DateTime.Now).SumAsync(k => (int?)k.SoLuongHienTai) ?? 0;
                var han = await _context.ChiTietKhos.Where(k => k.MaMon == m.MaMon && k.SoLuongHienTai > 0).OrderBy(k => k.NgayHetHan).Select(k => k.NgayHetHan).FirstOrDefaultAsync();
                double diem = await _context.DanhGias.Where(d => d.MaMon == m.MaMon).AverageAsync(d => (double?)d.SoSao) ?? 0.0;

                list.Add(new MonAnDTO
                {
                    MaMon = m.MaMon,
                    TenMon = m.TenMon,
                    GiaBan = m.Gia, 
                    GiaVon = m.GiaVon ?? 0, 
                    SoLuong = tonKho,
                    NgayHetHan = han,
                    MoTa = m.MoTa,
                    HinhAnh = !string.IsNullOrEmpty(m.HinhAnh) ? m.HinhAnh : m.HinhAnhMonAns?.FirstOrDefault()?.DuongDan,
                    MaDanhMuc = m.MaDanhMuc,
                    TenDanhMuc = m.MaDanhMucNavigation?.TenDanhMuc ?? "Chưa phân loại",
                    DaBan = m.DaBan ?? 0,
                    DiemDanhGia = Math.Round(diem, 1)
                });
            }

            return Ok(list);
        }

        // =============================================================
        // 4. THÊM MÓN MỚI 
        // =============================================================
        [HttpPost]
        public async Task<IActionResult> Create([FromForm] MonAnRequest req)
        {
            try
            {
                var monAn = new MonAn
                {
                    TenMon = req.TenMon,
                    Gia = req.GiaBan,
                    GiaVon = req.GiaVon ?? 0, 
                    MoTa = req.MoTa,
                    MaDanhMuc = req.MaDanhMuc,
                    TrangThai = "con_ban",
                    NgayTao = DateTime.Now,
                    IsDeleted = false,
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
                return Ok(new { message = "Thêm món thành công!", data = monAn });
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        // =============================================================
        // 5. CẬP NHẬT THÔNG TIN CƠ BẢN
        // =============================================================
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromForm] MonAnRequest req)
        {
            try
            {
                var monAn = await _context.MonAns.FirstOrDefaultAsync(m => m.MaMon == id);
                if (monAn == null) return NotFound("Không tìm thấy món cần sửa");

                monAn.TenMon = req.TenMon;
                monAn.Gia = req.GiaBan;
                monAn.GiaVon = req.GiaVon ?? monAn.GiaVon; 
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
                }

                await _context.SaveChangesAsync();
                return Ok(new { message = "Cập nhật thành công!" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        // =============================================================
        // 6. XÓA MỀM
        // =============================================================
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                var mon = await _context.MonAns.FindAsync(id);
                if (mon == null) return NotFound("Không tìm thấy món");

                mon.IsDeleted = true; 
                mon.TrangThai = "ngung_ban"; 

                var cartItems = _context.ChiTietGioHangs.Where(c => c.MaMon == id); 
                _context.ChiTietGioHangs.RemoveRange(cartItems);

                await _context.SaveChangesAsync();
                return Ok(new { message = "Đã xóa thành công." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        // =============================================================
        // 7. KHÔI PHỤC MÓN
        // =============================================================
        [HttpPut("Restore/{id}")]
        public async Task<IActionResult> Restore(int id)
        {
            var mon = await _context.MonAns.FindAsync(id);
            if (mon == null) return NotFound("Không tìm thấy món");
            mon.IsDeleted = false;
            mon.TrangThai = "con_ban";
            await _context.SaveChangesAsync();
            return Ok(new { message = "Đã khôi phục thành công!" });
        }

        // =============================================================
        // 🚨 HÀM KHÁM TỔNG QUÁT (X-RAY) TÌM LỖI 500
        // =============================================================
        [HttpGet("XRay")]
        public async Task<IActionResult> XRay()
        {
            var chuoiKetNoi = _context.Database.GetConnectionString();
            try
            {
                // Thử ép hệ thống mở cửa vào Database
                await _context.Database.OpenConnectionAsync();
                await _context.Database.CloseConnectionAsync();

                return Ok(new 
                { 
                    TrangThai = "🟢 XANH MƯỢT - ĐÃ THÔNG MẠNG DATABASE TỚI TẬN CÙNG!",
                    ChuoiKetNoiDangDung = chuoiKetNoi,
                    LoiKhuyen = "Database đã kết nối tốt. Nếu các hàm khác lỗi thì 100% là do Logic Code, không phải do mạng."
                });
            }
            catch (Exception ex)
            {
                // Nếu văng lỗi, bắt nó ói ra hết nguyên nhân
                return StatusCode(500, new 
                { 
                    TrangThai = "🔴 ĐỎ LÒM - ĐỨT CÁP DATABASE!",
                    LoiChinh = ex.Message,
                    LoiPhu = ex.InnerException?.Message,
                    ChuoiKetNoiDangDung = chuoiKetNoi,
                    NguyenNhan = chuoiKetNoi.Contains("localhost") ? "Railway chưa nhận được biến môi trường (Variables)" : "Chuỗi kết nối đúng nhưng bị chặn mạng hoặc sai Pass."
                });
            }
        }
    }
}