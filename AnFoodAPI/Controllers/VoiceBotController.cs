using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text;
using System.Text.Json;
using AnFoodAPI.Models;
using AnFoodAPI.DTOs;

namespace AnFoodAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class VoiceBotController : ControllerBase
    {
        // Nhớ đổi AnshopDbContext thành tên DbContext thật của sếp trong file AnshopDbContext.cs nhé
        private readonly AnshopDbContext _context; 
        private readonly IConfiguration _configuration;
        private readonly HttpClient _httpClient;

        public VoiceBotController(AnshopDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
            _httpClient = new HttpClient();
        }

        [HttpPost("ask")]
        public async Task<IActionResult> AskVoiceBot([FromBody] VoiceChatRequest request)
        {
            if (string.IsNullOrEmpty(request.UserText))
                return BadRequest(new { message = "Không nhận được giọng nói." });

            try
            {
                // 1. Cấu hình Prompt
                string prompt = $@"
Bạn là nhân viên tư vấn giọng nói của nhà hàng FastBite.
Luật: Trả lời CỰC KỲ NGẮN GỌN (dưới 40 từ), thân thiện, dễ nghe để hệ thống đọc ra loa. Xưng hô 'Dạ', 'nhà hàng', 'bạn'.
Câu hỏi của khách: {request.UserText}";

                // 2. Gọi API Gemini qua HTTP thuần (Không lo lỗi thư viện)
                string apiKey = "SẾP_DÁN_API_KEY_GEMINI_VÀO_ĐÂY"; 
                string apiUrl = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={apiKey}";

                var payload = new
                {
                    contents = new[]
                    {
                        new { parts = new[] { new { text = prompt } } }
                    }
                };

                var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
                var response = await _httpClient.PostAsync(apiUrl, content);
                
                if (!response.IsSuccessStatusCode)
                    return StatusCode((int)response.StatusCode, "Lỗi kết nối đến Google Gemini.");

                var responseString = await response.Content.ReadAsStringAsync();
                
                // Parse JSON thủ công để lấy Text
                using var jsonDoc = JsonDocument.Parse(responseString);
                var aiResponseText = jsonDoc.RootElement
                    .GetProperty("candidates")[0]
                    .GetProperty("content")
                    .GetProperty("parts")[0]
                    .GetProperty("text").GetString();

                // 3. Tận dụng bảng LichSuChat của sếp để lưu vết (Lưu 2 dòng: Khách hỏi & AI trả lời)
var chatKhachHang = new LichSuChat
{
    MaNguoiDung = request.MaNguoiDung,
    NoiDung = request.UserText,
    NguoiGui = "User", // SỬA CHỖ NÀY
    ThoiGian = DateTime.Now
};

var chatVoiceBot = new LichSuChat
{
    MaNguoiDung = request.MaNguoiDung,
    NoiDung = aiResponseText,
    NguoiGui = "Bot", // SỬA CHỖ NÀY
    ThoiGian = DateTime.Now
};

                _context.LichSuChats.AddRange(chatKhachHang, chatVoiceBot); // Ghi 2 record
                await _context.SaveChangesAsync();

                // 4. Trả về cho Frontend đọc
                return Ok(new VoiceChatResponse { AiText = aiResponseText });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi xử lý Voice Bot: " + ex.Message });
            }
        }
    }
}