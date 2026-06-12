﻿using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AnFoodAPI.Models;
using AnFoodAPI.DTOs; // Đảm bảo bạn đã có folder DTOs hoặc namespace này
using System.Net;
using System.Net.Mail;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization; // Cần thêm cái này để phân quyền

namespace AnFoodAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class NguoiDungController : ControllerBase
    {
        private readonly AnshopDbContext _context;
        private readonly IConfiguration _configuration;

        public NguoiDungController(AnshopDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        // ============================================================
        // 1. GET ALL USERS (Chỉ Admin mới được xem)
        // ============================================================
        [HttpGet]
        [Authorize(Roles = "admin")] // 🔒 Bảo mật: Chỉ Admin có Token mới xem được
        public async Task<ActionResult<IEnumerable<object>>> GetAllNguoiDung()
        {
            try 
            {
                var users = await _context.NguoiDungs
                    .OrderByDescending(u => u.MaNguoiDung)
                    .Select(u => new 
                    {
                        u.MaNguoiDung,
                        u.HoTen,
                        u.Email,
                        u.SoDienThoai,
                        u.DiaChi,
                        u.TrangThai,
                        u.NgayTao,
                        IsDeleted = u.IsDeleted.HasValue ? u.IsDeleted.Value : false, 
                        VaiTro = u.MaVaiTro == 1 ? "admin" : "user"
                    })
                    .ToListAsync();

                return Ok(users);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Server Error: " + ex.Message });
            }
        }

        // ============================================================
        // 2. GET USER BY ID (Ai cũng xem được profile của chính mình)
        // ============================================================
        [HttpGet("{id}")]
        [Authorize] 
        public async Task<ActionResult<object>> GetNguoiDung(int id)
        {
            // Kiểm tra: Người dùng chỉ được xem thông tin của chính mình (Trừ khi là Admin)
            var userIdClaim = User.FindFirst("MaNguoiDung")?.Value;
            var roleClaim = User.FindFirst(ClaimTypes.Role)?.Value;

            if (userIdClaim != null && roleClaim != "admin" && int.Parse(userIdClaim) != id)
            {
                return Forbid(); // Cấm xem trộm thông tin người khác
            }

            var user = await _context.NguoiDungs
                .Where(u => u.MaNguoiDung == id)
                .Select(u => new 
                {
                    u.MaNguoiDung,
                    u.HoTen,
                    u.Email,
                    u.SoDienThoai,
                    u.DiaChi,
                    u.TrangThai,
                    u.NgayTao,
                    IsDeleted = u.IsDeleted.HasValue ? u.IsDeleted.Value : false,
                    VaiTro = u.MaVaiTro == 1 ? "admin" : "user"
                })
                .FirstOrDefaultAsync();

            if (user == null) return NotFound(new { message = "User not found" });
            return user;
        }

        // ============================================================
        // 3. LOGIN (QUAN TRỌNG: Tạo Token chuẩn cho việc Đánh Giá)
        // ============================================================
        [HttpPost("DangNhap")]
        public IActionResult DangNhap([FromBody] UserLoginModel model)
        {
            // ⚠️ Lưu ý: Thực tế nên mã hóa mật khẩu (Hash) thay vì so sánh trực tiếp thế này
            var user = _context.NguoiDungs.FirstOrDefault(u => u.Email == model.Email && u.MatKhau == model.MatKhau);

            if (user == null) return Unauthorized(new { message = "Sai email hoặc mật khẩu!" });

            bool isLocked = user.IsDeleted.HasValue ? user.IsDeleted.Value : false;
            if (isLocked || user.TrangThai == "bi_khoa")
            {
                return Unauthorized(new { message = "Tài khoản đã bị khóa. Vui lòng liên hệ Admin." });
            }

            var tokenHandler = new JwtSecurityTokenHandler();
            // Lấy Key từ appsettings.json hoặc dùng key cứng (tạm thời)
            var key = Encoding.ASCII.GetBytes(_configuration["Jwt:Key"] ?? "DAY_LA_KEY_BI_MAT_CUA_FASTBITE_123456789"); 

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new Claim[]
                {
                    // 👇 QUAN TRỌNG: Phải đặt tên là "MaNguoiDung" để khớp với Controller Đánh Giá
                    new Claim("MaNguoiDung", user.MaNguoiDung.ToString()), 
                    new Claim(ClaimTypes.Name, user.HoTen ?? ""),
                    new Claim(ClaimTypes.Email, user.Email),
                    new Claim(ClaimTypes.Role, (user.MaVaiTro == 1 ? "admin" : "customer")) 
                }),
                Expires = DateTime.UtcNow.AddDays(7),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            var tokenString = tokenHandler.WriteToken(token);

            return Ok(new
            {
                message = "Đăng nhập thành công",
                token = tokenString, 
                user = new
                {
                    maNguoiDung = user.MaNguoiDung,
                    hoTen = user.HoTen,
                    email = user.Email,
                    soDienThoai = user.SoDienThoai,
                    vaiTro = (user.MaVaiTro == 1 ? "admin" : "customer"),
                    diaChi = user.DiaChi
                }
            });
        }

        // ============================================================
        // 4. REGISTER
        // ============================================================
        [HttpPost("DangKy")]
        public async Task<IActionResult> DangKy([FromBody] DangKyRequest req)
        {
            if (await _context.NguoiDungs.AnyAsync(u => u.Email == req.Email))
            {
                return BadRequest(new { message = "Email này đã được sử dụng!" });
            }

            var newUser = new NguoiDung
            {
                HoTen = req.TenNguoiDung,
                Email = req.Email,
                MatKhau = req.MatKhau, // Nên Hash mật khẩu ở đây
                SoDienThoai = req.SoDienThoai,
                MaVaiTro = 2, // Mặc định là khách hàng
                TrangThai = "hoat_dong",
                NgayTao = DateTime.Now,
                DiaChi = req.DiaChi,
                IsDeleted = false 
            };

            _context.NguoiDungs.Add(newUser);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Đăng ký thành công!", userId = newUser.MaNguoiDung });
        }

        // ============================================================
        // 5. ADD USER (ADMIN ONLY)
        // ============================================================
        [HttpPost]
        [Authorize(Roles = "admin")]
        public async Task<ActionResult<NguoiDung>> PostNguoiDung(NguoiDung nguoiDung)
        {
            if (await _context.NguoiDungs.AnyAsync(u => u.Email == nguoiDung.Email))
            {
                return Conflict(new { message = "Email đã tồn tại" });
            }

            if (nguoiDung.MaVaiTro == 0 || nguoiDung.MaVaiTro == null) nguoiDung.MaVaiTro = 2;
            nguoiDung.NgayTao ??= DateTime.Now;
            nguoiDung.IsDeleted = false; 

            _context.NguoiDungs.Add(nguoiDung);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetNguoiDung", new { id = nguoiDung.MaNguoiDung }, nguoiDung);
        }

        // ============================================================
        // 6. UPDATE USER
        // ============================================================
        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> PutNguoiDung(int id, NguoiDung nguoiDung)
        {
            // Check quyền: Chỉ admin hoặc chính chủ mới được sửa
            var userIdClaim = User.FindFirst("MaNguoiDung")?.Value;
            var roleClaim = User.FindFirst(ClaimTypes.Role)?.Value;

            if (userIdClaim != null && roleClaim != "admin" && int.Parse(userIdClaim) != id)
            {
                return Unauthorized(new { message = "Bạn không có quyền sửa thông tin người khác" });
            }

            if (id != nguoiDung.MaNguoiDung) return BadRequest(new { message = "ID không khớp" });

            var existingUser = await _context.NguoiDungs.FindAsync(id);
            if (existingUser == null) return NotFound();

            existingUser.HoTen = nguoiDung.HoTen;
            existingUser.SoDienThoai = nguoiDung.SoDienThoai;
            existingUser.DiaChi = nguoiDung.DiaChi;
            // Không cho phép sửa Email, Mật khẩu, Vai trò ở API này

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
               throw;
            }

            return Ok(new { message = "Cập nhật thành công!" });
        }

        // ============================================================
        // 7. SOFT DELETE (LOCK ACCOUNT - ADMIN ONLY)
        // ============================================================
        [HttpDelete("{id}")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> DeleteNguoiDung(int id)
        {
            var nguoiDung = await _context.NguoiDungs.FindAsync(id);
            if (nguoiDung == null) return NotFound(new { message = "Không tìm thấy người dùng" });

            if (nguoiDung.MaVaiTro == 1) 
            {
                return BadRequest(new { message = "Không thể khóa tài khoản Admin!" });
            }

            nguoiDung.IsDeleted = true;
            nguoiDung.TrangThai = "bi_khoa"; 
            await _context.SaveChangesAsync();

            return Ok(new { message = "Đã khóa tài khoản thành công." });
        }

        // ============================================================
        // 8. RESTORE (UNLOCK - ADMIN ONLY)
        // ============================================================
        [HttpPut("Restore/{id}")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> RestoreNguoiDung(int id)
        {
            var nguoiDung = await _context.NguoiDungs.FindAsync(id);
            if (nguoiDung == null) return NotFound("User not found");

            nguoiDung.IsDeleted = false;
            nguoiDung.TrangThai = "hoat_dong"; 
            await _context.SaveChangesAsync();

            return Ok(new { message = "Mở khóa tài khoản thành công!" });
        }

        // ============================================================
        // 9. OTP & QUÊN MẬT KHẨU (CÓ GỬI EMAIL THẬT)
        // ============================================================
        [HttpPost("GuiOTP")]
        public async Task<IActionResult> GuiOTP([FromBody] UserLoginModel model)
        {
            var user = await _context.NguoiDungs.FirstOrDefaultAsync(u => u.Email == model.Email);
            if (user == null) return NotFound(new { message = "Email không tồn tại trong hệ thống" });
            
            bool isLocked = user.IsDeleted.HasValue ? user.IsDeleted.Value : false;
            if (isLocked) return BadRequest(new { message = "Tài khoản đang bị khóa." });

            // Tạo mã OTP 6 số
            Random generator = new Random();
            string otp = generator.Next(0, 1000000).ToString("D6");

            user.OtpCode = otp;
            user.OtpExpiry = DateTime.Now.AddMinutes(5); // OTP hết hạn sau 5 phút
            await _context.SaveChangesAsync();

            // 🔥 GỬI EMAIL THẬT (Thay vì trả về OTP)
            // Bạn cần vào Google Account -> App Passwords để lấy mật khẩu ứng dụng
            bool emailSent = GuiEmailThat(user.Email, "Mã xác thực quên mật khẩu", $"Mã OTP của bạn là: <b>{otp}</b>. Mã có hiệu lực trong 5 phút.");

            if (emailSent)
                return Ok(new { message = "Đã gửi mã OTP vào email của bạn. Vui lòng kiểm tra." });
            else 
                return StatusCode(500, new { message = "Lỗi gửi email. (Dev: Check console log for details)" });
        }

        [HttpPost("DoiMatKhauOTP")]
        public async Task<IActionResult> DoiMatKhauOTP([FromBody] ResetPassModel model)
        {
            var user = await _context.NguoiDungs.FirstOrDefaultAsync(u => u.Email == model.Email);
            if (user == null) return NotFound(new { message = "Người dùng không tồn tại" });

            if (user.OtpCode != model.Otp || user.OtpExpiry < DateTime.Now)
            {
                return BadRequest(new { message = "Mã OTP không đúng hoặc đã hết hạn!" });
            }

            user.MatKhau = model.MatKhauMoi; // Nhớ hash nếu cần
            user.OtpCode = null;
            user.OtpExpiry = null;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Đổi mật khẩu thành công! Vui lòng đăng nhập lại." });
        }

        // --- HÀM PHỤ TRỢ: GỬI EMAIL SMTP ---
        private bool GuiEmailThat(string toEmail, string subject, string body)
        {
            try
            {
                // Cấu hình SMTP (Ví dụ dùng Gmail)
                var smtpClient = new SmtpClient("smtp.gmail.com")
                {
                    Port = 587,
                    // 👇 ĐIỀN EMAIL VÀ APP PASSWORD CỦA BẠN VÀO ĐÂY
                    Credentials = new NetworkCredential("your-email@gmail.com", "your-app-password"),
                    EnableSsl = true,
                };

                var mailMessage = new MailMessage
                {
                    From = new MailAddress("your-email@gmail.com", "AnFood Support"),
                    Subject = subject,
                    Body = body,
                    IsBodyHtml = true,
                };
                mailMessage.To.Add(toEmail);

                smtpClient.Send(mailMessage);
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine("Lỗi gửi mail: " + ex.Message);
                // Trả về false nếu chưa cấu hình email để code không chết
                // Trong môi trường test, ta có thể tạm return true và in OTP ra console
                Console.WriteLine($"[DEBUG MODE] OTP gửi đến {toEmail}: {body}"); 
                return false; 
            }
        }
    }

    // DTOs (Có thể tách ra file riêng trong folder DTOs cho gọn)
    public class UserLoginModel { public string Email { get; set; } public string MatKhau { get; set; } }
    public class DangKyRequest { public string TenNguoiDung { get; set; } public string Email { get; set; } public string MatKhau { get; set; } public string SoDienThoai { get; set; } public string DiaChi { get; set; } }
    public class ResetPassModel { public string Email { get; set; } public string Otp { get; set; } public string MatKhauMoi { get; set; } }
}