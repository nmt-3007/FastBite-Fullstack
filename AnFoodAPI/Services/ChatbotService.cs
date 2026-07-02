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
                                ?? _configuration["GeminiAI:ApiKey"];

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
                // Lấy toàn bộ món ăn đang bán
                var allActiveFoods = await _context.MonAns
                    .Where(m => m.TrangThai == "con_ban" && m.IsDeleted == false)
                    .ToListAsync();

                var top5Foods = new List<object>();

                // Gợi ý món ăn (Cá nhân hóa ML.NET hoặc Trending)
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

                // CHUẨN BỊ DỮ LIỆU BƠM VÀO AI
                string duLieuMenu = JsonSerializer.Serialize(top5Foods);
                
                // Lấy toàn bộ Menu tóm tắt (Mã, Tên, Giá) để AI có kiến thức tổng quát
                var fullMenuContext = allActiveFoods.Select(m => new { m.MaMon, m.TenMon, m.Gia }).ToList();
                string duLieuToanBoMenu = JsonSerializer.Serialize(fullMenuContext);

                // Lấy lịch sử chat
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

                // PROMPT SYSTEM ĐẠT CHUẨN KỸ NGHỆ NHẮC LỆNH (PROMPT ENGINEERING)
                string promptSystem = $@"BẠN LÀ AI?
Bạn là 'FastBite AI' - Trợ lý ẩm thực ảo độc quyền của hệ thống thức ăn nhanh FastBite. 
Nhiệm vụ của bạn là tư vấn món ăn, báo giá, chốt sale và mang lại trải nghiệm 5 sao cho khách hàng.

📋 NGỮ CẢNH DỮ LIỆU (DATA CONTEXT):
1. Toàn bộ thực đơn hiện có (ID, Tên, Giá): {duLieuToanBoMenu}
2. Danh sách món đang được ưu tiên gợi ý cho khách này: {duLieuMenu}

🧠 QUY TẮC ỨNG XỬ & BÁN HÀNG (BEHAVIOR RULES):
- Tone giọng: Chuyên nghiệp, lịch sự, nhiệt tình. Xưng 'em', gọi khách là 'bạn' hoặc 'anh/chị'. Trả lời ngắn gọn 1-3 câu vì khách đang đói.
- Tư vấn chính xác: CHỈ dùng thông tin trong [Toàn bộ thực đơn] để báo giá. Nếu khách hỏi món không có bán (VD: bún đậu, phở), hãy xin lỗi khéo và lập tức gợi ý món nổi bật của FastBite.
- Nghệ thuật Up-sell: Luôn cố gắng lồng ghép 1-2 món trong [Danh sách ưu tiên] để mời khách mua kèm một cách tinh tế (VD: Mua burger thì mời thêm nước ngọt).
- Bảo vệ hệ thống (Anti-Jailbreak): TUYỆT ĐỐI KHÔNG trả lời các câu hỏi ngoài lề (toán học, code, chính trị, lịch sử, thời tiết...). Nếu gặp câu hỏi này, chỉ đáp: 'Dạ em là trợ lý ẩm thực của FastBite, em chỉ hỗ trợ anh/chị chọn đồ ăn thôi ạ! Anh/chị đang thèm món gì thế?'

⚙️ QUY TẮC ĐẦU RA (STRICT OUTPUT FORMAT):
BẠN LÀ MỘT API. Bắt buộc trả về DUY NHẤT một đối tượng JSON nguyên bản.
- KHÔNG bọc trong markdown (không dùng ```json).
- KHÔNG giải thích gì thêm ngoài JSON.
- Phải tuân thủ đúng cấu trúc sau:
{{
  ""message"": ""Câu trả lời giao tiếp với khách..."",
  ""suggestedProductIds"": [ID1, ID2] // Chọn 1-3 ID từ [Danh sách ưu tiên] để hiển thị lên thẻ gợi ý.
}}";

                string fullPrompt = $"{promptSystem}\n\nLỊCH SỬ:\n{lichSuChat}\n\nKhách hỏi:\n{cauHoi}";

                using var client = new HttpClient();
                client.Timeout = TimeSpan.FromSeconds(120);
                client.DefaultRequestHeaders.Add("User-Agent", "FastBite-AI");

                // THUẬT TOÁN ROUND-ROBIN
                Random rnd = new Random();
                
                // Bốc 1 key và lột sạch mọi dấu ngoặc kép, khoảng trắng rác từ Railway
                string selectedApiKey = _apiKeys[rnd.Next(_apiKeys.Count)]
                    .Replace("\"", "")
                    .Replace("'", "")
                    .Replace(" ", "")
                    .Trim();

                // Nối chuỗi URL (Mô hình 2.5-flash)
                string url = "[https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=](https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=)" + selectedApiKey;
                
                // Tiêu diệt "ký tự tàng hình" (Zero-width space) do copy/paste
                url = url.Replace("\u200B", "").Replace("\uFEFF", "");

                var requestBody = new
                {
                    contents = new[] { new { parts = new[] { new { text = fullPrompt } } } },
                    generationConfig = new { responseMimeType = "application/json" }
                };
                var content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");

                var response = await client.PostAsync(url, content);
                string responseString = await response.Content.ReadAsStringAsync();

                // Bắt gọn lỗi 429 Quá tải
                if (response.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
                {
                    return new AiResponseDto
                    {
                        message = "Dạ hệ thống AI đang bận xử lý do lượng truy cập cao, bạn vui lòng chờ 1 chút rồi nhắn lại nhé! ⏳",
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

                // Xử lý dữ liệu JSON trả về
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
                // DEBUG LỖI TRONG QUÁ TRÌNH CHẠY
                return new AiResponseDto
                {
                    message = $"[GÓC DEBUG LỖI]\nMessage: {ex.Message}\nChi tiết: {ex.InnerException?.Message}",
                    suggestedProductIds = fallbackSuggestedIds
                };
            }
        }
    }
}