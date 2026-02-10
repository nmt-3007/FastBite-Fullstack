import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { 
  FaRobot, FaMagic, FaSmile, FaFrown, FaMeh, FaGrinHearts, FaBolt, 
  FaShoppingCart, FaRedo, FaUtensils 
} from 'react-icons/fa';

// ✅ IMPORT CHUẨN TỪ HỆ THỐNG
import axiosClient from '../../api/axiosClient';
import { getImageUrl } from '../../utils/imageHelper';

function Suggest({ addToCart }) { // Nhận prop addToCart để mua luôn
  const navigate = useNavigate();
  
  // --- STATE ---
  const [foods, setFoods] = useState([]);
  const [loadingData, setLoadingData] = useState(true); // Loading dữ liệu ban đầu
  const [analyzing, setAnalyzing] = useState(false);    // Hiệu ứng AI đang tính toán
  const [mood, setMood] = useState('');                 // Tâm trạng người dùng
  const [suggestion, setSuggestion] = useState(null);   // Món ăn được gợi ý

  // --- 1. FETCH DỮ LIỆU MÓN ĂN ---
  useEffect(() => {
    const fetchFoods = async () => {
      try {
        const res = await axiosClient.get('/MonAn');
        setFoods(Array.isArray(res) ? res : []);
      } catch (err) {
        console.error("Lỗi tải món ăn:", err);
      } finally {
        setLoadingData(false);
      }
    };
    fetchFoods();
  }, []);

  // --- 2. LOGIC "AI" GỢI Ý ---
  const handleSuggest = () => {
    if (!mood) {
      toast.warning("Hãy chọn tâm trạng của bạn trước nhé! 😊", { position: "top-center" });
      return;
    }
    if (foods.length === 0) {
      toast.error("Chưa có dữ liệu món ăn để gợi ý.", { position: "top-center" });
      return;
    }

    setAnalyzing(true);
    setSuggestion(null);

    // Giả lập AI đang suy nghĩ trong 2 giây
    setTimeout(() => {
      // Logic Random "Thông Minh" (Có thể nâng cấp sau)
      const randomIndex = Math.floor(Math.random() * foods.length);
      const result = foods[randomIndex];
      
      setSuggestion(result);
      setAnalyzing(false);
    }, 2000);
  };

  const handleAddToCart = () => {
    if (suggestion) {
      // Giả lập tính giá (nếu có logic sale thì thêm vào đây)
      addToCart({ ...suggestion, gia: suggestion.gia, soLuong: 1 });
      toast.success(`Đã thêm ${suggestion.tenMon} vào giỏ!`, { position: "top-center" });
    }
  };

  // Danh sách tâm trạng
  const moods = [
    { id: 'happy', icon: <FaGrinHearts />, label: 'Vui Vẻ', color: '#ff6b6b' },
    { id: 'sad', icon: <FaFrown />, label: 'Buồn', color: '#54a0ff' },
    { id: 'tired', icon: <FaMeh />, label: 'Mệt Mỏi', color: '#8395a7' },
    { id: 'excited', icon: <FaBolt />, label: 'Hào Hứng', color: '#feca57' },
  ];

  return (
    <div style={{ padding: '60px 20px', minHeight: '100vh', background: 'linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)', fontFamily: '"Poppins", sans-serif' }}>
      <ToastContainer />
      
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        {/* HEADER */}
        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', background: '#fff', borderRadius: '50%', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', marginBottom: '20px', color: '#e64a19', fontSize: '2.5rem' }}>
            <FaRobot />
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '800', color: '#2d3436', marginBottom: '10px' }}>
            Hôm Nay Ăn Gì?
          </h1>
          <p style={{ color: '#636e72', fontSize: '1.1rem' }}>
            Để <span style={{ fontWeight: 'bold', color: '#e64a19' }}>FastBite AI</span> giúp bạn chọn món ngon chuẩn gu theo tâm trạng nhé!
          </p>
        </div>

        {/* --- MAIN CARD --- */}
        <div style={{ background: '#fff', borderRadius: '25px', boxShadow: '0 20px 60px rgba(0,0,0,0.05)', overflow: 'hidden', padding: '40px', minHeight: '400px', position: 'relative' }}>
          
          {/* TRẠNG THÁI 1: CHỌN TÂM TRẠNG */}
          {!suggestion && !analyzing && (
            <div className="fade-in">
              <h3 style={{ textAlign: 'center', marginBottom: '30px', color: '#2d3436' }}>Bạn đang cảm thấy thế nào?</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                {moods.map((m) => (
                  <div 
                    key={m.id}
                    onClick={() => setMood(m.id)}
                    style={{ 
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
                      padding: '20px', borderRadius: '15px', cursor: 'pointer', border: mood === m.id ? `2px solid ${m.color}` : '2px solid transparent',
                      background: mood === m.id ? `${m.color}20` : '#f8f9fa', transition: '0.3s',
                      transform: mood === m.id ? 'scale(1.05)' : 'scale(1)'
                    }}
                  >
                    <div style={{ fontSize: '2.5rem', color: m.color, marginBottom: '10px' }}>{m.icon}</div>
                    <span style={{ fontWeight: '600', color: '#2d3436' }}>{m.label}</span>
                  </div>
                ))}
              </div>

              <div style={{ textAlign: 'center' }}>
                <button 
                  onClick={handleSuggest}
                  disabled={loadingData}
                  style={{ 
                    padding: '15px 40px', background: 'linear-gradient(to right, #e64a19, #ff7e5f)', 
                    color: '#fff', border: 'none', borderRadius: '50px', fontSize: '1.2rem', fontWeight: 'bold', 
                    cursor: 'pointer', boxShadow: '0 10px 20px rgba(230, 74, 25, 0.3)', transition: 'transform 0.2s',
                    display: 'inline-flex', alignItems: 'center', gap: '10px'
                  }}
                  onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                  onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <FaMagic /> {loadingData ? 'Đang tải dữ liệu...' : 'Gợi Ý Món Ngon'}
                </button>
              </div>
            </div>
          )}

          {/* TRẠNG THÁI 2: ĐANG PHÂN TÍCH */}
          {analyzing && (
            <div style={{ textAlign: 'center', padding: '50px 0' }}>
              <div className="spinner" style={{ fontSize: '3rem', marginBottom: '20px' }}>🤖</div>
              <h3 style={{ color: '#2d3436' }}>AI đang phân tích khẩu vị của bạn...</h3>
              <p style={{ color: '#636e72' }}>Đang tìm kiếm trong {foods.length} món ăn hấp dẫn...</p>
            </div>
          )}

          {/* TRẠNG THÁI 3: KẾT QUẢ */}
          {suggestion && (
            <div className="fade-in" style={{ textAlign: 'center' }}>
              <h3 style={{ color: '#636e72', marginBottom: '20px', fontWeight:'normal' }}>
                Dựa trên tâm trạng của bạn, FastBite gợi ý:
              </h3>
              
              <div style={{ maxWidth: '400px', margin: '0 auto 30px', background: '#fff', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', overflow: 'hidden', border: '1px solid #eee' }}>
                <img 
                  src={getImageUrl(suggestion.hinhAnh)} 
                  alt={suggestion.tenMon} 
                  style={{ width: '100%', height: '250px', objectFit: 'cover' }} 
                  onError={e => e.target.src='https://placehold.co/400x300?text=Yummy'}
                />
                <div style={{ padding: '20px' }}>
                  <h2 style={{ color: '#e64a19', margin: '0 0 10px', fontSize: '1.8rem' }}>{suggestion.tenMon}</h2>
                  <p style={{ color: '#636e72', marginBottom: '15px' }}>{suggestion.moTa || 'Hương vị tuyệt vời không thể chối từ!'}</p>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2d3436' }}>{suggestion.gia?.toLocaleString()} đ</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
                <button 
                  onClick={() => { setSuggestion(null); setMood(''); }}
                  style={{ padding: '12px 30px', background: '#fff', color: '#636e72', border: '1px solid #dfe6e9', borderRadius: '50px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <FaRedo /> Thử Lại
                </button>
                
                <button 
                  onClick={handleAddToCart}
                  style={{ padding: '12px 30px', background: '#e64a19', color: '#fff', border: 'none', borderRadius: '50px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 5px 15px rgba(230, 74, 25, 0.3)' }}
                >
                  <FaShoppingCart /> Đặt Món Này
                </button>

                <Link to={`/product-detail/${suggestion.maMon}`} style={{ textDecoration: 'none' }}>
                    <button style={{ padding: '12px 30px', background: '#2d3436', color: '#fff', border: 'none', borderRadius: '50px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FaUtensils /> Xem Chi Tiết
                    </button>
                </Link>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Animation CSS */}
      <style>{`
        .fade-in { animation: fadeIn 0.5s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .spinner { display: inline-block; animation: bounce 1s infinite alternate; }
        @keyframes bounce { from { transform: translateY(0); } to { transform: translateY(-15px); } }
      `}</style>
    </div>
  );
}

export default Suggest;