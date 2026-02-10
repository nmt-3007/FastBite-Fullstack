using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AnFoodAPI.Models; 
using Microsoft.AspNetCore.Authorization; // Để dùng [Authorize]
using System.Security.Claims; // Để đọc thông tin bên trong Token

namespace AnFoodAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DanhGiaController : ControllerBase
    {
        // 👇 Sửa thành AnshopDbContext
        private readonly AnshopDbContext _context;

        public DanhGiaController(AnshopDbContext context)
        {
            _context = context;
        }

        // GET: api/DanhGia
        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetDanhGia()
        {
            // Kết nối bảng DanhGia với NguoiDung để lấy HoTen
            var query = from d in _context.DanhGias
                        join u in _context.NguoiDungs on d.MaNguoiDung equals u.MaNguoiDung
                        orderby d.NgayDanhGia descending
                        select new
                        {
                            d.MaDanhGia,
                            d.MaMon,        // Cần cái này để lọc món ăn
                            d.MaNguoiDung,
                            d.SoSao,
                            d.NhanXet,
                            d.NgayDanhGia,
                            // 👇 Lấy tên người dùng (Nếu DB bạn là Cot 'HoTen' hay 'TenDangNhap' thì sửa ở đây nhé)
                            TenHienThi = u.HoTen
                        };

            return Ok(await query.ToListAsync());
        }
        // POST: api/DanhGia
        // POST: api/DanhGia
        [HttpPost]
        [Authorize] // 🔒 BẮT BUỘC PHẢI CÓ TOKEN MỚI ĐƯỢC VÀO
        public async Task<ActionResult<DanhGia>> PostDanhGia(DanhGia danhGia)
        {
            // 1. GIẢI MÃ TOKEN ĐỂ LẤY ID NGƯỜI DÙNG (An toàn tuyệt đối)
            // Tìm claim tên là "MaNguoiDung" hoặc "Id" hoặc NameIdentifier tùy cách bạn tạo Token lúc Login
            var userIdClaim = User.FindFirst("MaNguoiDung")?.Value 
                              ?? User.FindFirst("Id")?.Value 
                              ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(userIdClaim))
            {
                return Unauthorized(new { message = "Token không hợp lệ!" });
            }

            int userIdThat = int.Parse(userIdClaim); // Đây là ID thật của người đang đăng nhập

            // 2. GÁN ID THẬT VÀO DỮ LIỆU (Chống giả mạo)
            danhGia.MaNguoiDung = userIdThat; 

            // 3. LOGIC CŨ: KIỂM TRA ĐÃ MUA HÀNG CHƯA
            var daMuaHang = await (from ct in _context.ChiTietDonHangs
                                   join dh in _context.DonHangs on ct.MaDonHang equals dh.MaDonHang
                                   where dh.MaNguoiDung == userIdThat // Dùng ID thật
                                   && ct.MaMon == danhGia.MaMon
                                   select ct).AnyAsync();

            if (!daMuaHang)
            {
                return BadRequest(new { message = "Bạn phải mua món ăn này mới được đánh giá nha! 🛒" });
            }

            // 4. KIỂM TRA: Đã đánh giá chưa?
            var daDanhGia = await _context.DanhGias
                .AnyAsync(d => d.MaNguoiDung == userIdThat && d.MaMon == danhGia.MaMon);
            
            if (daDanhGia)
            {
                 return BadRequest(new { message = "Bạn đã đánh giá món này rồi!" });
            }

            // 5. LƯU VÀO DB
            danhGia.NgayDanhGia = DateTime.Now;
            _context.DanhGias.Add(danhGia);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetDanhGia", new { id = danhGia.MaDanhGia }, danhGia);
        }
    }
}