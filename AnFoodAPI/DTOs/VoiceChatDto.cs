namespace AnFoodAPI.DTOs
{
    public class VoiceChatRequest
    {
        public int? MaNguoiDung { get; set; }
        public string UserText { get; set; } // Lời nói của khách đã dịch thành text
    }

    public class VoiceChatResponse
    {
        public string AiText { get; set; } // Câu trả lời của AI
    }
}