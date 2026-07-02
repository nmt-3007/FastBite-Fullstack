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
        private readonly string _apiKey;

        public ChatbotService(
            AnshopDbContext context,
            IRecommendationService aiService,
            IConfiguration configuration)
        {
            _context = context;
            _aiService = aiService;
            _configuration = configuration;

            _apiKey =
    Environment.GetEnvironmentVariable("GEMINI_API_KEY")
    ?? _configuration["GeminiAI:ApiKey"];

if (string.IsNullOrWhiteSpace(_apiKey))
{
    throw new Exception("Không tìm thấy Gemini API Key.");
}
        }

        public async Task<AiResponseDto> LayPhanHoiTuAiAsync(int? maNguoiDung, string cauHoi)
        {
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
                        top5Foods.Add(new
                        {
                            id = m.MaMon,
                            name = m.TenMon,
                            price = m.Gia,
                            tag = "Cá nhân hóa theo ML.NET"
                        });
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
                        top5Foods.Add(new
                        {
                            id = m.MaMon,
                            name = m.TenMon,
                            price = m.Gia,
                            tag = "Bán chạy nhất"
                        });
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

                string fullPrompt =
                    $"{promptSystem}\n\nLỊCH SỬ:\n{lichSuChat}\n\nKhách hỏi:\n{cauHoi}";

                using var client = new HttpClient();

                    client.Timeout = TimeSpan.FromSeconds(120);

                    client.DefaultRequestHeaders.Add(
                        "User-Agent",
                        "FastBite-AI");

                string url =
                    $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={_apiKey}";

                var requestBody = new
                {
                    contents = new[]
                    {
                        new
                        {
                            parts = new[]
                            {
                                new
                                {
                                    text = fullPrompt
                                }
                            }
                        }
                    },
                    generationConfig = new
                    {
                        responseMimeType = "application/json"
                    }
                };

                var content = new StringContent(
                    JsonSerializer.Serialize(requestBody),
                    Encoding.UTF8,
                    "application/json");

                var response = await client.PostAsync(url, content);

                string responseString =
                    await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    return new AiResponseDto
                    {
                        message =
$@"Gemini API Error

HTTP: {(int)response.StatusCode}

{responseString}"
                    };
                }

                using (JsonDocument doc = JsonDocument.Parse(responseString))
                {
                    if (!doc.RootElement.TryGetProperty("candidates", out var candidates))
{
    return new AiResponseDto
    {
        message = "Gemini không trả về dữ liệu."
    };
}

if (candidates.GetArrayLength() == 0)
{
    return new AiResponseDto
    {
        message = "Gemini không có phản hồi."
    };
}

string aiJson = candidates[0]
    .GetProperty("content")
    .GetProperty("parts")[0]
    .GetProperty("text")
    .GetString();

                    var options = new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    };

                    return JsonSerializer.Deserialize<AiResponseDto>(
                        aiJson,
                        options);
                }
            }
            catch (Exception ex)
            {
                return new AiResponseDto
                {
                    message =
$@"CHATBOT EXCEPTION

{ex}"
                };
            }
        }
    }
}