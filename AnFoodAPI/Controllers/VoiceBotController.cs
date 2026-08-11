using Microsoft.AspNetCore.Mvc;
using AnFoodAPI.Models;
using AnFoodAPI.DTOs;
using System.Text;
using System.Text.Json;

namespace AnFoodAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class VoiceBotController : ControllerBase
    {
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
            try
            {
                // 1. Tự động lấy Key từ Railway Variable hoặc appsettings.json
                string apiKey = Environment.GetEnvironmentVariable("GEMINI_API_KEYS") 
                    ?? _configuration["GeminiAI:ApiKey"];

                if (string.IsNullOrEmpty(apiKey))
                    return BadRequest(new { message = "LỖI BACKEND: Chưa cấu hình API Key Gemini trên Railway." });

                string prompt = $"Bạn là nhân viên nhà hàng FastBite. Trả lời ngắn gọn dưới 40 từ. Khách hỏi: {request.UserText}";

                // 2. Chốt cứng Model chuẩn: gemini-1.5-flash
                string apiUrl = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={apiKey}";

                var payload = new {
                    contents = new[] { new { parts = new[] { new { text = prompt } } } }
                };

                var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
                var response = await _httpClient.PostAsync(apiUrl, content);
                string responseString = await response.Content.ReadAsStringAsync();

                // 3. Nếu Google Gemini chửi, quăng thẳng lỗi đó về Frontend
                if (!response.IsSuccessStatusCode)
                    return BadRequest(new { message = $"LỖI GEMINI: {responseString}" });

                using var jsonDoc = JsonDocument.Parse(responseString);
                var aiResponseText = jsonDoc.RootElement
                    .GetProperty("candidates")[0]
                    .GetProperty("content")
                    .GetProperty("parts")[0]
                    .GetProperty("text").GetString();

                // 4. Lưu Database
                var chatKhachHang = new LichSuChat { MaNguoiDung = request.MaNguoiDung, NoiDung = request.UserText, NguoiGui = "User", ThoiGian = DateTime.Now };
                var chatVoiceBot = new LichSuChat { MaNguoiDung = request.MaNguoiDung, NoiDung = aiResponseText, NguoiGui = "Bot", ThoiGian = DateTime.Now };

                _context.LichSuChats.AddRange(chatKhachHang, chatVoiceBot);
                await _context.SaveChangesAsync();

                return Ok(new VoiceChatResponse { AiText = aiResponseText });
            }
            catch (Exception ex)
            {
                // 5. Bắt mọi lỗi Exception (Code, DB...)
                return StatusCode(500, new { message = $"LỖI SERVER TỰ BẮT: {ex.Message}" });
            }
        }
    }
}