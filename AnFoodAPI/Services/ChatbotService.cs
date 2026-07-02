using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using AnFoodAPI.Models;
using AnFoodAPI.DTOs;

namespace AnFoodAPI.Services
{
    public interface IChatbotService
    {
        Task<AiResponseDto> LayPhanHoiTuAiAsync(int? maNguoiDung, string cauHoi);
    }

    public class ChatbotService : IChatbotService
    {
        private readonly AnshopDbContext _context;
        private readonly IRecommendationService _aiService;
        private readonly IConfiguration _configuration;
        private readonly List<string> _apiKeys;

        public ChatbotService(
            AnshopDbContext context,
            IRecommendationService aiService,
            IConfiguration configuration)
        {
            _context = context;
            _aiService = aiService;
            _configuration = configuration;

            string keysString = Environment.GetEnvironmentVariable("GEMINI_API_KEYS") 
                                ?? _configuration["GeminiAI:ApiKeys"]
                                ?? _configuration["GeminiAI:ApiKey"]; // Dự phòng tên biến cũ

            if (string.IsNullOrWhiteSpace(keysString))
            {
                throw new Exception("Không tìm thấy cấu hình Gemini API Keys.");
            }

            // BỘ LỌC THÉP: Cắt sạch mọi khoảng trắng, dấu phẩy, dấu chấm phẩy, xuống dòng
            _apiKeys = keysString.Split(new[] { ',', ';', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries)
                                 .Select(k => k.Trim())
                                 .Where(k => !string.IsNullOrEmpty(k))
                                 .ToList();

            if (!_apiKeys.Any())
            {
                throw new Exception("Danh sách Gemini API Keys trống.");
            }
        }

        public async Task<AiResponseDto> LayPhanHoiTuAiAsync(int? maNguoiDung, string cauHoi)
        {
            List<int> fallbackSuggestedIds = new List<int>();

            try
            {
                var allActiveFoods = await _context.MonAns
                    .Where(m => m.TrangThai == "con_ban" && m.IsDeleted == false)
                    .ToListAsync();

                var top5Foods = new List<object>();

                if (maNguoiDung.HasValue && maNguoiDung.Value > 0)
                {
                    var scoredItems = new List<Tuple<MonAn, float>>();

                    foreach (var food in allActiveFoods)
                    {
                        float score = _aiService.PredictScore(maNguoiDung.Value, food.MaMon);
                        scoredItems.Add(new Tuple<MonAn, float>(food, score));
                    }

                    var topPersonalized = scoredItems
                        .OrderByDescending(x => x.Item2)
                        .Take(5)
                        .Select(x => x.Item1)
                        .ToList();

                    foreach (var m in topPersonalized)
                    {
                        top5Foods.Add(new { id = m.MaMon, name = m.TenMon, price = m.Gia, tag = "Cá nhân hóa theo ML.NET" });
                        fallbackSuggestedIds.Add(m.MaMon);
                    }
                }
                else
                {
                    var topTrending = allActiveFoods
                        .OrderByDescending(m => m.BanChay)
                        .Take(5)
                        .ToList();

                    foreach (var m in topTrending)
                    {
                        top5Foods.Add(new { id = m.MaMon, name = m.TenMon, price = m.Gia, tag = "Bán chạy nhất" });
                        fallbackSuggestedIds.Add(m.MaMon);
                    }
                }

                string duLieuMenu = JsonSerializer.Serialize(top5Foods);
                string lichSuChat = "";

                if (maNguoiDung.HasValue && maNguoiDung.Value > 0)
                {
                    var history = await _context.LichSuChats
                        .Where(x => x.MaNguoiDung == maNguoiDung.Value)
                        .OrderByDescending(x => x.ThoiGian)
                        .Take(5)
                        .ToListAsync();

                    history.Reverse();

                    foreach (var msg in history)
                    {
                        lichSuChat += $"{msg.NguoiGui}: {msg.NoiDung}\n";
                    }
                }

                string promptSystem = @"Bạn là trợ lý AI thông minh của nhà hàng FastBite.

Đây là danh sách TOP 5 món ăn phù hợp nhất với khách hàng hiện tại do thuật toán AI gợi ý:

" + duLieuMenu + @"

🚨 YÊU CẦU BẮT BUỘC:

Chỉ trả về JSON.

{
  ""message"": ""..."",
  ""suggestedProductIds"": [1,2]
}

Không được trả thêm markdown.
Không được dùng ```json.
Không được thêm giải thích.

Ưu tiên tư vấn các món trong TOP 5.";

                string fullPrompt = $"{promptSystem}\n\nLỊCH SỬ:\n{lichSuChat}\n\nKhách hỏi:\n{cauHoi}";

                using var client = new HttpClient();
                client.Timeout = TimeSpan.FromSeconds(120);
                client.DefaultRequestHeaders.Add("User-Agent", "FastBite-AI");

                // THUẬT TOÁN ROUND-ROBIN
                Random rnd = new Random();
                
                // 1. Bốc 1 key và lột sạch mọi dấu ngoặc kép, khoảng trắng rác từ Railway
                string selectedApiKey = _apiKeys[rnd.Next(_apiKeys.Count)]
                    .Replace("\"", "")
                    .Replace("'", "")
                    .Replace(" ", "")
                    .Trim();

                // 2. Nối chuỗi URL (Sếp nhớ xóa trắng dòng url cũ đi nhé)
                string url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + selectedApiKey;
                
                // 3. Tiêu diệt "ký tự tàng hình" (Zero-width space) do copy/paste
                url = url.Replace("\u200B", "").Replace("\uFEFF", "");

                var requestBody = new
                {
                    contents = new[] { new { parts = new[] { new { text = fullPrompt } } } },
                    generationConfig = new { responseMimeType = "application/json" }
                };
                var content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");

                var response = await client.PostAsync(url, content);
                string responseString = await response.Content.ReadAsStringAsync();

                if (response.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
                {
                    return new AiResponseDto
                    {
                        message = "Dạ hệ thống AI đang bận xử lý do quá tải (Lỗi 429), bạn vui lòng chờ 1 phút rồi nhắn lại nhé! ⏳",
                        suggestedProductIds = fallbackSuggestedIds
                    };
                }

                if (!response.IsSuccessStatusCode)
                {
                    return new AiResponseDto
                    {
                        message = $"[API LỖI {(int)response.StatusCode}] {responseString}",
                        suggestedProductIds = fallbackSuggestedIds
                    };
                }

                using (JsonDocument doc = JsonDocument.Parse(responseString))
                {
                    if (!doc.RootElement.TryGetProperty("candidates", out var candidates) || candidates.GetArrayLength() == 0)
                    {
                        return new AiResponseDto { message = "Gemini không có phản hồi." };
                    }

                    string aiJson = candidates[0].GetProperty("content").GetProperty("parts")[0].GetProperty("text").GetString();

                    var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                    return JsonSerializer.Deserialize<AiResponseDto>(aiJson, options);
                }
            }
            catch (Exception ex)
            {
                // DEBUG LỖI ĐỂ TÌM NGUYÊN NHÂN CHÍNH XÁC
                return new AiResponseDto
                {
                    message = $"[GÓC DEBUG LỖI]\nMessage: {ex.Message}\nChi tiết: {ex.InnerException?.Message}",
                    suggestedProductIds = fallbackSuggestedIds
                };
            }
        }
    }
}