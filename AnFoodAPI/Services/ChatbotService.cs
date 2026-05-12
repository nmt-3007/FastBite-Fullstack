using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
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
        // 👉 TÍCH HỢP LÕI THUẬT TOÁN ML.NET VÀO CHATBOT
        private readonly IRecommendationService _aiService; 
        private readonly string _apiKey = "AIzaSyAnwAcD_BpR9WtyJN7XRmKQnjRq0ugUjww"; 

        // Inject IRecommendationService vào Constructor
        public ChatbotService(AnshopDbContext context, IRecommendationService aiService)
        {
            _context = context;
            _aiService = aiService;
        }

        public async Task<AiResponseDto> LayPhanHoiTuAiAsync(int? maNguoiDung, string cauHoi)
        {
            try
            {
                // ================================================================
                // 1. CHẠY THUẬT TOÁN ML.NET ĐỂ LỌC RA TOP 5 MÓN TỐT NHẤT
                // ================================================================
                var allActiveFoods = await _context.MonAns
                    .Where(m => m.TrangThai == "con_ban" && m.IsDeleted == false)
                    .ToListAsync();

                var top5Foods = new List<object>();

                if (maNguoiDung.HasValue && maNguoiDung.Value > 0)
                {
                    // Khách đã đăng nhập: Dùng AI ML.NET Collaborative Filtering chấm điểm
                    var scoredItems = new List<Tuple<MonAn, float>>();
                    foreach (var food in allActiveFoods)
                    {
                        float score = _aiService.PredictScore(maNguoiDung.Value, food.MaMon);
                        scoredItems.Add(new Tuple<MonAn, float>(food, score));
                    }

                    // Lấy 5 món điểm cao nhất
                    var topPersonalized = scoredItems
                        .OrderByDescending(x => x.Item2)
                        .Take(5)
                        .Select(x => x.Item1)
                        .ToList();

                    foreach (var m in topPersonalized)
                    {
                        top5Foods.Add(new { id = m.MaMon, name = m.TenMon, price = m.Gia, tag = "Cá nhân hóa theo ML.NET" });
                    }
                }
                else
                {
                    // Khách vãng lai: Bài toán khởi động lạnh (Lấy top bán chạy)
                    var topTrending = allActiveFoods
                        .OrderByDescending(m => m.BanChay)
                        .Take(5)
                        .ToList();

                    foreach (var m in topTrending)
                    {
                        top5Foods.Add(new { id = m.MaMon, name = m.TenMon, price = m.Gia, tag = "Bán chạy nhất" });
                    }
                }

                // 👉 CHỈ GỬI ĐÚNG TOP 5 MÓN CHO GEMINI ĐỌC (Rất tiết kiệm Token và AI trả lời siêu nhanh)
                string duLieuMenu = JsonSerializer.Serialize(top5Foods);

                // ================================================================
                // 2. LẤY LỊCH SỬ CHAT ĐỂ AI NHỚ NGỮ CẢNH
                // ================================================================
                string lichSuChat = "";
                if (maNguoiDung.HasValue && maNguoiDung.Value > 0)
                {
                    var history = await _context.LichSuChats
                        .Where(x => x.MaNguoiDung == maNguoiDung.Value)
                        .OrderByDescending(x => x.ThoiGian)
                        .Take(5).ToListAsync();
                        
                    history.Reverse(); 
                    foreach(var msg in history) 
                    { 
                        lichSuChat += $"{msg.NguoiGui}: {msg.NoiDung}\n"; 
                    }
                }

                // ================================================================
                // 3. PROMPT ÉP LUẬT JSON KHẮC NGHIỆT
                // ================================================================
                string promptSystem = @"Bạn là trợ lý AI thông minh của nhà hàng FastBite. 
Đây là danh sách TOP 5 món ăn phù hợp nhất với khách hàng hiện tại do thuật toán AI gợi ý: " + duLieuMenu + @"

🚨 YÊU CẦU BẮT BUỘC TỪ HỆ THỐNG: 
Trình bày kết quả ĐÚNG định dạng JSON sau. TUYỆT ĐỐI KHÔNG thêm văn bản ngoài JSON.
{
  ""message"": ""Câu tư vấn của bạn. Giao tiếp tự nhiên. Tuyệt đối KHÔNG chứa mã ID, KHÔNG dùng ngoặc vuông."",
  ""suggestedProductIds"": [Danh sách ID của các món ăn bạn muốn hiển thị thẻ. VD: [1, 58]. Trả về [] nếu không cần gợi ý]
}

- Đọc 'LỊCH SỬ' để hiểu khách đang hỏi về món gì trước đó.
- Ưu tiên tư vấn các món nằm trong danh sách TOP 5 ở trên.";

                string fullPrompt = $"{promptSystem}\n\nLỊCH SỬ:\n{lichSuChat}\nKhách hỏi: {cauHoi}\nBot:";

                using (var client = new HttpClient())
                {
                    string url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={_apiKey}";
                    
                    var requestBody = new { 
                        contents = new[] { new { parts = new[] { new { text = fullPrompt } } } },
                        generationConfig = new { responseMimeType = "application/json" } 
                    };
                    
                    var content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");
                    var response = await client.PostAsync(url, content);
                    string responseString = await response.Content.ReadAsStringAsync();

                    if (response.IsSuccessStatusCode)
                    {
                        using (JsonDocument doc = JsonDocument.Parse(responseString))
                        {
                            string aiJson = doc.RootElement.GetProperty("candidates")[0]
                                            .GetProperty("content").GetProperty("parts")[0]
                                            .GetProperty("text").GetString();
                            
                            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                            return JsonSerializer.Deserialize<AiResponseDto>(aiJson, options);
                        }
                    }
                    
                    return new AiResponseDto { message = "Dạ hệ thống tư vấn AI đang quá tải, anh/chị chờ em 1 lát nhé!" };
                }
            }
            catch (Exception)
            {
                return new AiResponseDto { message = $"Dạ AI đang bảo trì nâng cấp, anh/chị thử lại sau xíu nhé." };
            }
        }
    }
}