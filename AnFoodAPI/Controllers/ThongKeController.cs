using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AnFoodAPI.Models;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;
using System;

namespace AnFoodAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ThongKeController : ControllerBase
    {
        private readonly AnshopDbContext _context;

        public ThongKeController(AnshopDbContext context)
        {
            _context = context;
        }

        // GET: api/ThongKe/Dashboard
        [HttpGet("Dashboard")]
        public async Task<IActionResult> GetDashboardStats(string? timeSpan = "week", string? date = null)
        {
            try
            {
                // 1. KHỞI TẠO QUERY
                var query = _context.DonHangs.AsQueryable();
                DateTime now = DateTime.Now;
                DateTime startDate = DateTime.MinValue;
                DateTime endDate = DateTime.MaxValue;

                // 2. XỬ LÝ THỜI GIAN (QUAN TRỌNG: Đưa về 00:00:00 và 23:59:59)
                switch (timeSpan?.ToLower())
                {
                    case "today":
                        startDate = now.Date; // 00:00 hôm nay
                        endDate = now.Date.AddDays(1).AddTicks(-1); // 23:59 hôm nay
                        break;
                    case "week":
                        startDate = now.Date.AddDays(-6); // 7 ngày gần nhất (tính cả hôm nay)
                        endDate = now.Date.AddDays(1).AddTicks(-1);
                        break;
                    case "month":
                        startDate = new DateTime(now.Year, now.Month, 1); // Ngày 1 đầu tháng
                        endDate = now.Date.AddDays(1).AddTicks(-1);
                        break;
                    case "custom":
                        if (!string.IsNullOrEmpty(date) && DateTime.TryParse(date, out DateTime parsedDate))
                        {
                            startDate = parsedDate.Date;
                            endDate = parsedDate.Date.AddDays(1).AddTicks(-1);
                        }
                        break;
                    // case "all" thì giữ nguyên MinValue và MaxValue
                }

                // Áp dụng lọc ngày (nếu không phải 'all')
                if (timeSpan?.ToLower() != "all")
                {
                    query = query.Where(d => d.NgayDat >= startDate && d.NgayDat <= endDate);
                }

                // 3. TÍNH TOÁN KPI (FIX LỖI LỆCH SỐ LIỆU TẠI ĐÂY)
                // Chỉ lấy các đơn Hợp Lệ (Không tính đơn Hủy, Từ Chối, Đã Hủy)
                var validOrdersQuery = query.Where(d => d.TrangThai != "huy" && d.TrangThai != "TuChoi" && d.TrangThai != "DaHuy");

                // Tính tổng tiền
                decimal doanhThu = await validOrdersQuery.SumAsync(d => d.TongTien ?? 0);
                
                // Tính tổng đơn (Dùng chung query với Doanh thu để số liệu khớp nhau)
                int tongDon = await validOrdersQuery.CountAsync();

                // Các chỉ số phụ (đếm toàn hệ thống, không theo ngày)
                var tongMon = await _context.MonAns.CountAsync();
                var tongKhach = await _context.NguoiDungs.CountAsync(u => u.MaVaiTro != 1); 

                // 4. BIỂU ĐỒ TRÒN (Tỷ lệ trạng thái)
                var statusData = await _context.ChiTietDonHangs
                    .Include(ct => ct.DonHang)
                    .Include(ct => ct.MonAn)
                    .ThenInclude(m => m.MaDanhMucNavigation)
                    .Where(ct => ct.DonHang.NgayDat >= startDate && ct.DonHang.NgayDat <= endDate 
                                 && ct.DonHang.TrangThai != "huy" && ct.DonHang.TrangThai != "TuChoi" && ct.DonHang.TrangThai != "DaHuy")
                    .GroupBy(ct => ct.MonAn.MaDanhMucNavigation.TenDanhMuc)
                    .Select(g => new
                    {
                        name = g.Key ?? "Khác", 
                        value = g.Sum(x => x.SoLuong ?? 0)
                    })
                    .OrderByDescending(x => x.value)
                    .ToListAsync();

                // 5. TOP SẢN PHẨM BÁN CHẠY (Trong khoảng thời gian lọc)
                var topStats = await _context.ChiTietDonHangs
                    .Where(ct => ct.DonHang.NgayDat >= startDate && ct.DonHang.NgayDat <= endDate && ct.DonHang.TrangThai != "huy" && ct.DonHang.TrangThai != "TuChoi")
                    .GroupBy(ct => ct.MaMon)
                    .Select(g => new
                    {
                        MaMon = g.Key,
                        SoLuongBan = g.Sum(x => x.SoLuong ?? 0),
                        DoanhThu = g.Sum(x => (decimal)(x.SoLuong ?? 0) * (x.DonGia ?? 0))
                    })
                    .OrderByDescending(x => x.SoLuongBan)
                    .Take(5)
                    .ToListAsync();

                var topSanPham = new List<object>();
                foreach (var stat in topStats)
                {
                    if (stat.MaMon.HasValue)
                    {
                        var mon = await _context.MonAns
                            .Include(m => m.HinhAnhMonAns)
                            .FirstOrDefaultAsync(m => m.MaMon == stat.MaMon);
                        
                        if (mon != null)
                        {
                            topSanPham.Add(new
                            {
                                TenMon = mon.TenMon,
                                SoLuongBan = stat.SoLuongBan,
                                DoanhThu = stat.DoanhThu,
                                HinhAnh = !string.IsNullOrEmpty(mon.HinhAnh) 
                                          ? mon.HinhAnh 
                                          : mon.HinhAnhMonAns.Select(h => h.DuongDan).FirstOrDefault()
                            });
                        }
                    }
                }

                // 6. ĐƠN HÀNG MỚI NHẤT (Lấy 5 đơn mới nhất bất kể trạng thái)
                var donMoi = await _context.DonHangs
                    .OrderByDescending(d => d.NgayDat)
                    .Take(5)
                    .Select(d => new
                    {
                        d.MaDonHang,
                        NguoiNhan = d.NguoiNhan ?? "Khách vãng lai",
                        TongTien = d.TongTien ?? 0,
                        TrangThai = d.TrangThai,
                        NgayDat = d.NgayDat
                    })
                    .ToListAsync();

                // 7. BIỂU ĐỒ DOANH THU (7 NGÀY GẦN NHẤT)
                var chartStartDate = DateTime.Now.Date.AddDays(-6);
                var chartDataRaw = await _context.DonHangs
                    .Where(d => d.NgayDat >= chartStartDate && (d.TrangThai != "huy" && d.TrangThai != "TuChoi" && d.TrangThai != "DaHuy"))
                    .Select(d => new { d.NgayDat, TongTien = d.TongTien ?? 0 })
                    .ToListAsync();

                var revenueChart = Enumerable.Range(0, 7)
                    .Select(offset =>
                    {
                        var currentDate = chartStartDate.AddDays(offset);
                        var stats = chartDataRaw
                            .Where(d => d.NgayDat.HasValue && d.NgayDat.Value.Date == currentDate)
                            .ToList();
                        
                        return new
                        {
                            Date = currentDate.ToString("dd/MM"),
                            DoanhThu = stats.Sum(x => x.TongTien),
                            SoDon = stats.Count
                        };
                    })
                    .ToList();

                // 8. CẢNH BÁO TỒN KHO (Lấy 5 món sắp hết)
                var lowStock = await _context.MonAns
                    .Where(m => m.TonKho != null && m.TonKho <= 10)
                    .OrderBy(m => m.TonKho)
                    .Take(5)
                    .Select(m => new
                    {
                        m.TenMon,
                        m.TonKho,
                        HinhAnh = !string.IsNullOrEmpty(m.HinhAnh) 
                                  ? m.HinhAnh 
                                  : m.HinhAnhMonAns.Select(h => h.DuongDan).FirstOrDefault()
                    })
                    .ToListAsync();

                // TRẢ VỀ JSON KẾT QUẢ
                return Ok(new
                {
                    doanhThu,
                    donHang = tongDon,
                    tongMon,
                    tongKhach,
                    aov = tongDon > 0 ? (doanhThu / tongDon) : 0, 
                    statusData,
                    topSanPham,
                    donMoi,
                    revenueChart,
                    lowStock
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi server: " + ex.Message });
            }
        }
    }
}