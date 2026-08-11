import React, { useState, useEffect } from 'react';

const VoiceBot = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Khởi tạo API nhận diện giọng nói có sẵn của trình duyệt
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = SpeechRecognition ? new SpeechRecognition() : null;

  useEffect(() => {
    if (recognition) {
      recognition.continuous = false;
      recognition.lang = 'vi-VN'; // Chuyên nghe tiếng Việt
      recognition.interimResults = false;

      // Khi người dùng nói xong, trình duyệt dịch ra text
      recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        sendToBackend(text); // Gửi câu vừa nói xuống ASP.NET Core
      };

      recognition.onerror = (event) => {
        console.error("Lỗi Mic:", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  // Bật/Tắt Mic
  const toggleListen = () => {
    if (!recognition) {
      alert("Trình duyệt của bạn không hỗ trợ thu âm. Vui lòng dùng Chrome/Edge.");
      return;
    }

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
      setTranscript('');
      setAiResponse('');
    }
  };

  // Gửi Text xuống Backend và nhận tư vấn
  const sendToBackend = async (text) => {
    setIsLoading(true);
    try {
      // Đổi port 5000 thành port Backend ASP.NET thực tế của sếp nếu cần
      const response = await fetch('http://localhost:5000/api/VoiceBot/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maNguoiDung: 1, userText: text }) 
      });
      
      const data = await response.json();
      setAiResponse(data.aiText);
      speakText(data.aiText); // Gọi hàm phát âm thanh

    } catch (error) {
      console.error("Lỗi kết nối Backend:", error);
      setAiResponse("Xin lỗi, tôi đang không thể kết nối tới máy chủ.");
    }
    setIsLoading(false);
  };

  // Trình duyệt tự động đọc văn bản thành giọng nói (Text-to-Speech)
  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'vi-VN'; // Đọc tiếng Việt
      utterance.rate = 1.0; // Tốc độ đọc bình thường
      window.speechSynthesis.speak(utterance);
    } else {
      console.warn("Trình duyệt không hỗ trợ Text-to-Speech");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-lg border border-gray-100 max-w-md mx-auto mt-10">
      <h2 className="text-xl font-bold text-orange-500 mb-4">Trợ lý AI FastBite 🤖</h2>
      
      {/* Nút bấm Micro có hiệu ứng nhấp nháy khi đang nghe */}
      <button
        onClick={toggleListen}
        className={`relative flex items-center justify-center w-20 h-20 rounded-full text-white text-3xl transition-all duration-300 ${
          isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-orange-500 hover:bg-orange-600'
        }`}
      >
        {isListening ? (
          <>
            <span className="absolute w-full h-full rounded-full bg-red-400 animate-ping opacity-75"></span>
            🛑
          </>
        ) : (
          '🎤'
        )}
      </button>

      <p className="mt-4 text-sm font-medium text-gray-600">
        {isListening ? "Đang lắng nghe..." : "Bấm vào Micro để nói"}
      </p>

      {/* Hiển thị đoạn hội thoại */}
      <div className="mt-6 w-full space-y-4">
        {transcript && (
          <div className="bg-gray-100 p-3 rounded-lg text-gray-700">
            <strong>Bạn:</strong> {transcript}
          </div>
        )}
        
        {isLoading && (
          <div className="text-orange-500 font-semibold animate-pulse text-center">
            AI đang suy nghĩ... 🤔
          </div>
        )}

        {aiResponse && (
          <div className="bg-orange-50 p-3 rounded-lg border border-orange-200 text-orange-800">
            <strong>FastBite AI:</strong> {aiResponse}
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceBot;