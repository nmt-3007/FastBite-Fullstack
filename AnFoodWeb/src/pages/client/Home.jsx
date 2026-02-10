import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Slider from "react-slick";
import "slick-carousel/slick/slick.css"; 
import "slick-carousel/slick/slick-theme.css";

// ✅ 1. IMPORT HỆ THỐNG
import axiosClient from '../../api/axiosClient'; 
import { getImageUrl } from '../../utils/imageHelper';

import { 
  FaHamburger, FaPizzaSlice, FaDrumstickBite, FaIceCream, 
  FaTruck, FaStar, FaArrowRight, FaMagic, 
  FaCoffee, FaLeaf, FaUserShield, FaChevronLeft, FaChevronRight, FaFire, FaShoppingBag, FaTag, FaEye
} from 'react-icons/fa';

// --- COMPONENT CON: NÚT SLIDER ---
const ArrowButton = ({ onClick, direction }) => (
  <div onClick={onClick} className={`slider-arrow ${direction}`}>
    {direction === 'next' ? <FaChevronRight /> : <FaChevronLeft />}
  </div>
);

// --- COMPONENT CON: BANNER QUẢNG CÁO (FULL WIDTH MAGAZINE STYLE) ---
const PromoBanner = () => {
  const [banners, setBanners] = useState([]);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const res = await axiosClient.get('/QuangCao/Active');
        setBanners(Array.isArray(res) ? res : []);
      } catch (err) { setBanners([]); }
    };
    fetchBanners();
  }, []);

  if (!Array.isArray(banners) || banners.length === 0) return null;

  const settings = {
    dots: true, infinite: true, speed: 1000, slidesToShow: 1, slidesToScroll: 1,
    autoplay: true, autoplaySpeed: 6000, arrows: true,
    nextArrow: <ArrowButton direction="next" />,
    prevArrow: <ArrowButton direction="prev" />,
    appendDots: dots => <div style={{ bottom: "30px" }}><ul className="custom-dots"> {dots} </ul></div>,
  };

  return (
    <section className="banner-section">
        <style>
            {`
                /* 1. SECTION FULL WIDTH */
                .banner-section { 
                    margin: 0; padding: 0; 
                    width: 100%; 
                    overflow: hidden; 
                    background: #fdfdfd; 
                }
                
                /* Custom Arrow */
                .slider-arrow {
                    position: absolute; top: 50%; transform: translateY(-50%); z-index: 20;
                    width: 60px; height: 60px; border-radius: 50%;
                    background: #fff; box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                    display: flex; align-items: center; justify-content: center;
                    color: #2d3436; cursor: pointer; transition: 0.3s;
                    border: 1px solid #f1f2f6;
                }
                .slider-arrow:hover { background: #e64a19; color: #fff; transform: translateY(-50%) scale(1.1); box-shadow: 0 15px 40px rgba(230, 74, 25, 0.3); }
                .slider-arrow.next { right: 30px; }
                .slider-arrow.prev { left: 30px; }

                /* Custom Dots */
                .custom-dots { margin: 0; padding: 0; display: flex; justify-content: center; gap: 10px; }
                .custom-dots li { width: 12px; height: 12px; border-radius: 50%; background: #dfe6e9; transition: 0.3s; }
                .custom-dots li.slick-active { width: 40px; border-radius: 12px; background: #e64a19; }
                .custom-dots li button { display: none; }

                /* 2. LAYOUT BANNER */
                .banner-slide-bg {
                    width: 100%;
                    background: linear-gradient(135deg, #fffbf0 0%, #fff 100%); 
                    padding: 60px 0; 
                }

                .slide-inner-container {
                    max-width: 1400px; 
                    margin: 0 auto;
                    padding: 0 50px;
                    display: grid;
                    grid-template-columns: 1fr 1.6fr; 
                    gap: 60px;
                    align-items: center;
                    min-height: 500px;
                }

                .text-content { z-index: 10; }
                
                /* Ảnh Banner Xịn */
                .image-content { 
                    width: 100%; height: 500px; 
                    border-radius: 30px; 
                    overflow: hidden; 
                    position: relative;
                    box-shadow: 0 25px 50px rgba(0,0,0,0.15); 
                    transform: perspective(1000px) rotateY(-2deg); 
                    transition: 0.5s;
                }
                .image-content:hover { transform: perspective(1000px) rotateY(0deg) scale(1.02); }
                .image-content img { width: 100%; height: 100%; object-fit: cover; }

                /* Mobile Responsive */
                @media (max-width: 1024px) {
                    .slide-inner-container { grid-template-columns: 1fr; text-align: center; padding: 0 20px; gap: 40px; }
                    .text-content { order: 2; padding-bottom: 40px; }
                    .image-content { order: 1; height: 350px; transform: none; }
                    .image-content:hover { transform: none; }
                    .slider-arrow { display: none !important; }
                }
            `}
        </style>
        
        <div style={{ width: '100%' }}>
            <Slider {...settings}>
                {banners.map((banner, index) => {
                    const bgImage = getImageUrl(banner.hinhAnh) || 'https://placehold.co/1200x600/eee/999?text=Delicious+Food';
                    
                    return (
                        <div key={banner.maQuangCao || index}>
                            <div className="banner-slide-bg">
                                <div className="slide-inner-container">
                                    <div className="text-content">
                                        {banner.phanTramGiam > 0 && (
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: '#fff0e6', color: '#e64a19', padding: '10px 25px', borderRadius: '50px', fontWeight: '800', fontSize: '0.9rem', marginBottom: '25px', letterSpacing: '1px', border:'1px solid #ffccb3', boxShadow:'0 5px 15px rgba(230, 74, 25, 0.1)' }}>
                                                <FaFire /> DEAL SỐC GIẢM {banner.phanTramGiam}%
                                            </div>
                                        )}

                                        <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: 'clamp(2.5rem, 5vw, 4rem)', lineHeight: '1.15', fontWeight: '800', color: '#2d3436', marginBottom: '20px' }}>
                                            {banner.tieuDe}
                                        </h2>

                                        <p style={{ fontSize: '1.2rem', color: '#636e72', marginBottom: '40px', lineHeight: '1.7', maxWidth: '90%' }}>
                                            {banner.moTa || "Cơ hội thưởng thức những món ăn tuyệt hảo với mức giá không thể tin được. Đặt ngay hôm nay!"}
                                        </p>

                                        <Link to={banner.maMon ? `/product-detail/${banner.maMon}` : "/menu"} 
                                            style={{ 
                                                background: '#e64a19', color: '#fff', padding: '18px 50px', 
                                                borderRadius: '50px', fontWeight: 'bold', textDecoration: 'none', fontSize: '1.1rem',
                                                display: 'inline-flex', alignItems: 'center', gap: '12px', 
                                                boxShadow: '0 15px 30px rgba(230, 74, 25, 0.3)', transition: '0.3s' 
                                            }}
                                            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                                            onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                                        >
                                            {banner.maMon ? "MUA NGAY" : "KHÁM PHÁ MENU"} <FaArrowRight />
                                        </Link>
                                    </div>

                                    <div className="image-content">
                                        <img src={bgImage} alt={banner.tieuDe} onError={(e) => e.target.src='https://placehold.co/1200x600/eee/999?text=No+Image'} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </Slider>
        </div>
    </section>
  );
};

// --- COMPONENT CON: DANH MỤC ---
const CategorySection = () => {
    const categories = [
      { icon: <FaHamburger />, name: "Burger", color: "#ff9f43" },
      { icon: <FaPizzaSlice />, name: "Pizza", color: "#ff6b6b" },
      { icon: <FaDrumstickBite />, name: "Gà Rán", color: "#54a0ff" },
      { icon: <FaIceCream />, name: "Tráng Miệng", color: "#fd79a8" },
      { icon: <FaCoffee />, name: "Đồ Uống", color: "#1dd1a1" },
    ];
    return (
      <section style={{ padding: '50px 0', background: '#fff' }}>
        <div className="container">
          <h3 style={{ textAlign: 'center', marginBottom: '40px', color: '#2d3436', fontSize: '2rem', fontWeight:'800', fontFamily: '"Playfair Display", serif' }}>Hôm nay bạn muốn ăn gì?</h3>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', flexWrap: 'wrap' }}>
            {categories.map((cat, index) => (
              <div key={index} style={{ textAlign: 'center', cursor: 'pointer', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-8px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
                <div style={{ width: '90px', height: '90px', background: `${cat.color}15`, borderRadius: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px', color: cat.color, fontSize: '2.5rem', boxShadow: `0 10px 20px ${cat.color}30` }}>{cat.icon}</div>
                <span style={{ fontWeight: '700', color: '#555', fontSize: '1.1rem' }}>{cat.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
};

// --- COMPONENT CON: FEATURES ---
const FeaturesSection = () => (
    <section style={{ padding: '60px 0', background: '#fff' }}>
      <div className="container" style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: '2.2rem', marginBottom: '50px' }}>Tại Sao Chọn <span style={{ color: '#e64a19' }}>FastBite?</span></h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
          <div style={{ padding: '30px', borderRadius: '15px', border: '1px solid #eee', transition: '0.3s' }}><FaTruck size={50} color="#e64a19" style={{ marginBottom: '20px' }} /><h3>Giao Hàng Hỏa Tốc</h3><p style={{ color: '#636e72', marginTop: '10px' }}>Cam kết giao hàng trong vòng 30 phút.</p></div>
          <div style={{ padding: '30px', borderRadius: '15px', border: '1px solid #eee', transition: '0.3s' }}><FaLeaf size={50} color="#4caf50" style={{ marginBottom: '20px' }} /><h3>Nguyên Liệu Tươi Sạch</h3><p style={{ color: '#636e72', marginTop: '10px' }}>Nhập mới mỗi ngày từ nông trại đạt chuẩn.</p></div>
          <div style={{ padding: '30px', borderRadius: '15px', border: '1px solid #eee', transition: '0.3s' }}><FaUserShield size={50} color="#0984e3" style={{ marginBottom: '20px' }} /><h3>An Toàn Vệ Sinh</h3><p style={{ color: '#636e72', marginTop: '10px' }}>Quy trình chế biến khép kín tuyệt đối.</p></div>
        </div>
      </div>
    </section>
);

// --- 🔴 COMPONENT CHÍNH: HOME ---
const Home = () => {
  const [foods, setFoods] = useState([]);
  const [banners, setBanners] = useState([]);
  const [reviews, setReviews] = useState([]); // ✅ Thêm state lưu đánh giá

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 🔥 Lấy thêm dữ liệu Đánh Giá để tính sao thật
        // Sử dụng .catch để tránh sập web nếu API Đánh giá chưa có
        const [resFoods, resBanners, resReviews] = await Promise.all([
            axiosClient.get('/MonAn'),
            axiosClient.get('/QuangCao/Active'),
            axiosClient.get('/DanhGia').catch(() => []) 
        ]);
        setFoods(Array.isArray(resFoods) ? resFoods : []);
        setBanners(Array.isArray(resBanners) ? resBanners : []);
        setReviews(Array.isArray(resReviews) ? resReviews : []);
      } catch (err) { console.error(err); }
    };
    fetchData();
  }, []);

  // ✅ Hàm tính điểm trung bình sao cho từng món
  const getAverageRating = (itemId) => {
      if (!reviews || reviews.length === 0) return 0; // Trả về 0 nếu chưa có dữ liệu
      
      const itemReviews = reviews.filter(r => Number(r.maMon || r.ma_mon || r.MaMon) === Number(itemId));
      
      if (itemReviews.length === 0) return 0; // ✅ Trả về 0 nếu món này chưa có đánh giá nào
      
      const total = itemReviews.reduce((sum, r) => sum + (Number(r.soSao || r.so_sao) || 0), 0);
      return (total / itemReviews.length).toFixed(1);
  };

  const bestSellerFoods = useMemo(() => {
    if (!Array.isArray(foods) || foods.length === 0) return [];
    
    // 1. Ưu tiên lọc theo cờ 'banChay'
    let hotItems = foods.filter(item => 
        item.banChay === true || item.banChay === 1 || 
        item.BanChay === true || item.BanChay === 1
    );

    // 2. Nếu ít món quá, thử sắp xếp theo 'daBan'
    if (hotItems.length < 6) {
        const soldItems = [...foods].sort((a, b) => (b.daBan || 0) - (a.daBan || 0));
        const uniqueItems = new Map();
        [...hotItems, ...soldItems].forEach(item => {
             const id = item.maMon || item.MaMon;
             if (!uniqueItems.has(id)) uniqueItems.set(id, item);
        });
        hotItems = Array.from(uniqueItems.values());
    }
    
    // 3. Fallback cuối cùng
    if (hotItems.length === 0) {
      hotItems = foods;
    }

    return hotItems.slice(0, 6);
  }, [foods]);

  const getPriceInfo = (item) => {
    const safeBanners = Array.isArray(banners) ? banners : [];
    const itemId = Number(item.maMon);
    const itemCatId = Number(item.maDanhMuc);
    const originalPrice = Number(item.gia);

    const itemBanner = safeBanners.find(b => Number(b.maMon) === itemId);
    const categoryBanner = safeBanners.find(b => {
        const bCatId = Number(b.maDanhMuc);
        const bMonId = Number(b.maMon || 0);
        return bCatId === itemCatId && bMonId === 0;
    });

    const appliedBanner = itemBanner || categoryBanner;
    if (appliedBanner && appliedBanner.phanTramGiam > 0) {
        return {
            finalPrice: originalPrice * (1 - appliedBanner.phanTramGiam / 100),
            originalPrice: originalPrice,
            isSale: true,
            percent: appliedBanner.phanTramGiam
        };
    }
    return { finalPrice: originalPrice, originalPrice: originalPrice, isSale: false, percent: 0 };
  };

  return (
    <div>
      {/* 1. HERO SECTION (GIỮ NGUYÊN VÌ NÓ ĐẸP SẴN) */}
      <section style={{ background: 'linear-gradient(135deg, #fffbf0 0%, #fff0e0 100%)', minHeight: '85vh', display: 'flex', alignItems: 'center', padding: '40px 0' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '50px', flexWrap: 'wrap-reverse' }}>
          <div style={{ flex: '1', minWidth: '350px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: '#ffe0b2', color: '#e65100', padding: '8px 16px', borderRadius: '30px', fontWeight: '600', fontSize: '0.9rem', marginBottom: '25px' }}>
              <span>🎉</span> Giảm 20% cho đơn hàng đầu tiên
            </div>
            <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: 'clamp(3rem, 5vw, 4.5rem)', lineHeight: '1.2', color: '#2d3436', marginBottom: '25px' }}>
              Đồ Ăn Ngon, <br /> <span style={{ color: '#e64a19' }}>Giao Siêu Tốc</span>
            </h1>
            <p style={{ fontSize: '1.1rem', color: '#636e72', marginBottom: '40px', lineHeight: '1.8', maxWidth: '500px' }}>
              Thưởng thức những món ăn nóng hổi tuyệt vời. Công nghệ AI gợi ý thông minh giúp bạn chọn món chỉ trong vài giây!
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '50px' }}>
              <Link to="/menu" style={{ backgroundColor: '#e64a19', color: '#fff', padding: '15px 35px', borderRadius: '50px', textDecoration: 'none', fontWeight: 'bold', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 10px 20px rgba(230, 74, 25, 0.3)' }}>
                Xem Thực Đơn <FaArrowRight />
              </Link>
              <Link to="/suggest" style={{ backgroundColor: '#fff', color: '#e64a19', padding: '15px 35px', borderRadius: '50px', textDecoration: 'none', fontWeight: 'bold', fontSize: '1.1rem', border: '2px solid #e64a19', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FaMagic /> AI Gợi Ý
              </Link>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '40px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}><div style={{ background: '#ffebee', padding: '12px', borderRadius: '50%', color: '#e64a19' }}><FaTruck size={24}/></div><div><div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>15-30p</div><div style={{ fontSize: '0.9rem', color: '#636e72' }}>Giao hàng</div></div></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}><div style={{ background: '#fff8e1', padding: '12px', borderRadius: '50%', color: '#ffb300' }}><FaStar size={24}/></div><div><div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>4.9/5</div><div style={{ fontSize: '0.9rem', color: '#636e72' }}>Đánh giá</div></div></div>
            </div>
          </div>
          
          <div style={{ flex: '1', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', minWidth: '350px' }}>
            <img src="https://placehold.co/400x400/e64a19/white?text=Big+Burger" alt="Main Burger" className="hero-image-center" style={{ width: '350px', zIndex: 2, position: 'relative', filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.2))', borderRadius: '50%' }} />
            <div className="orbit-container" style={{ position: 'absolute', zIndex: 1, width: '450px', height: '450px', border: '2px dashed #ffe0b2', borderRadius: '50%', animation: 'spin 20s linear infinite' }}>
              <div style={{ position: 'absolute', top: '0', left: '50%', transform: 'translate(-50%, -50%)', background: '#fff', padding: '10px', borderRadius: '50%', boxShadow: '0 5px 15px rgba(0,0,0,0.1)' }}><FaPizzaSlice color="#e64a19" size={24}/></div>
              <div style={{ position: 'absolute', bottom: '0', left: '50%', transform: 'translate(-50%, 50%)', background: '#fff', padding: '10px', borderRadius: '50%', boxShadow: '0 5px 15px rgba(0,0,0,0.1)' }}><FaIceCream color="#fd79a8" size={24}/></div>
              <div style={{ position: 'absolute', left: '0', top: '50%', transform: 'translate(-50%, -50%)', background: '#fff', padding: '10px', borderRadius: '50%', boxShadow: '0 5px 15px rgba(0,0,0,0.1)' }}><FaHamburger color="#ff9f43" size={24}/></div>
              <div style={{ position: 'absolute', right: '0', top: '50%', transform: 'translate(50%, -50%)', background: '#fff', padding: '10px', borderRadius: '50%', boxShadow: '0 5px 15px rgba(0,0,0,0.1)' }}><FaCoffee color="#6f4e37" size={24}/></div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. DANH MỤC */}
      <CategorySection />
      
      {/* 3. BANNER SLIDER (NEW MAGAZINE STYLE) */}
      <PromoBanner />
      
      {/* 4. FEATURES */}
      <FeaturesSection />

      {/* 5. BEST SELLER */}
      <section style={{ padding: '80px 0', background: '#f9f9f9' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '50px' }}>
              <span style={{ color: '#e64a19', fontWeight: 'bold', letterSpacing: '1px' }}>MENU HẤP DẪN</span>
              <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: '2.5rem', marginTop: '10px' }}>Món Ăn <span style={{ color: '#e64a19' }}>Bán Chạy Nhất</span></h2>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '30px' }}>
            {bestSellerFoods.map((item) => {
              const priceInfo = getPriceInfo(item);
              const realRating = getAverageRating(item.maMon); // ✅ Lấy số sao thật

              return (
                <div key={item.maMon} 
                     style={{ 
                        backgroundColor: '#fff', borderRadius: '20px', 
                        boxShadow: '0 10px 20px rgba(0,0,0,0.05)', 
                        overflow: 'hidden', height: '460px', 
                        display: 'flex', flexDirection: 'column', position:'relative',
                        transition: 'transform 0.3s'
                      }} 
                      onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-10px)'} 
                      onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  
                  <div style={{ position: 'absolute', top: '15px', left: '15px', background: '#ff6b6b', color: '#fff', padding: '5px 12px', borderRadius: '30px', fontSize: '0.8rem', fontWeight: 'bold', zIndex: 10, boxShadow: '0 4px 10px rgba(255, 107, 107, 0.4)' }}>HOT</div>
                  
                  {priceInfo.isSale && (
                      <div style={{ position: 'absolute', top: '15px', right: '15px', background: '#d63031', color: '#fff', padding: '5px 12px', borderRadius: '30px', fontWeight: 'bold', fontSize: '0.95rem', zIndex: 10, display: 'flex', alignItems: 'center', gap: '5px', boxShadow: '0 4px 10px rgba(214, 48, 49, 0.4)' }}>
                          <FaTag size={12} /> -{priceInfo.percent}%
                      </div>
                  )}

                  <div style={{ height: '280px', position: 'relative' }}>
                    <img 
                        src={getImageUrl(item.hinhAnh)} 
                        alt={item.tenMon} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        onError={(e) => { e.target.src = 'https://placehold.co/400x300?text=No+Image'; }} 
                    />
                    <div className="hover-overlay" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.3s' }} onMouseOver={e => e.currentTarget.style.opacity = 1} onMouseOut={e => e.currentTarget.style.opacity = 0}>
                        <Link to={`/product-detail/${item.maMon}`}>
                            <button style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '50%', color: '#2d3436', border: 'none', cursor: 'pointer', display: 'flex' }}><FaEye size={22} /></button>
                        </Link>
                    </div>
                  </div>
                  
                  <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <h3 style={{ fontSize: '1.2rem', margin: '0', color: '#2d3436', fontWeight: '700', lineHeight: '1.4', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.tenMon}</h3>
                            {/* ✅ HIỂN THỊ SỐ SAO THẬT */}
                            {/* ✅ Thay đoạn code cũ bằng đoạn này */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.9rem', marginBottom:'15px' }}>
                            {Number(realRating) > 0 ? (
                                // Trường hợp 1: Có sao thì hiện màu vàng
                                <span style={{ color: '#ffa502', display:'flex', alignItems:'center', gap:'4px', fontWeight:'bold', backgroundColor: '#fff9e6', padding: '4px 8px', borderRadius: '8px' }}>
                                    <FaStar /> {realRating}
                                </span>
                            ) : (
                                // Trường hợp 2: Chưa có sao (0) thì hiện "Món mới" màu xanh
                                <span style={{ color: '#00b894', fontWeight:'600', fontSize:'0.8rem', backgroundColor: '#e6fffa', padding: '4px 8px', borderRadius: '8px' }}>
                                    ✨ Món mới
                                </span>
                            )}
                        </div>
                        </div>
                        <div style={{ marginTop: '10px' }}>
                            {priceInfo.isSale ? (
                                <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                                    <span style={{ color: '#d63031', fontSize: '1.5rem', fontWeight: '800' }}>{priceInfo.finalPrice.toLocaleString()} đ</span>
                                    <span style={{ color: '#b2bec3', fontSize: '1.1rem', textDecoration: 'line-through', fontWeight: '500' }}>{priceInfo.originalPrice.toLocaleString()} đ</span>
                                </div>
                            ) : (
                                <p style={{ color: '#e64a19', fontSize: '1.4rem', fontWeight: '800', margin: 0 }}>{item.gia?.toLocaleString()} đ</p>
                            )}
                        </div>
                    </div>

                    <Link to={`/product-detail/${item.maMon}`} style={{ textDecoration: 'none' }}>
                        <button style={{ width: '100%', padding: '15px', backgroundColor: '#e64a19', color: '#fff', border: 'none', borderRadius: '15px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(230, 74, 25, 0.2)', transition: 'transform 0.2s' }} onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'} onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}>
                            <FaShoppingBag /> ĐẶT MÓN NGAY
                        </button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div style={{ textAlign: 'center', marginTop: '60px' }}>
              <Link to="/menu" style={{ border: '2px solid #2d3436', color: '#2d3436', padding: '15px 45px', borderRadius: '50px', textDecoration: 'none', fontWeight: 'bold', transition: '0.3s', display: 'inline-block', fontSize: '1.1rem' }} onMouseOver={e => {e.target.style.background = '#2d3436'; e.target.style.color = '#fff'}} onMouseOut={e => {e.target.style.background = 'transparent'; e.target.style.color = '#2d3436'}}>
                  Xem Tất Cả Món Ăn
              </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;