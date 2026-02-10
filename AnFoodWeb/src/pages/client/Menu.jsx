import React, { useEffect, useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

// ✅ IMPORT CHUẨN TỪ HỆ THỐNG
import axiosClient from '../../api/axiosClient'; 
import { getImageUrl } from '../../utils/imageHelper';

import { 
  FaShoppingCart, FaStar, FaSearch, FaEye, 
  FaHamburger, FaPizzaSlice, FaDrumstickBite, FaMugHot, FaBoxOpen, FaUtensils, FaCookieBite,
  FaSortAmountDown, FaTag, FaCheckCircle
} from 'react-icons/fa';

function Menu({ addToCart }) {
  // --- 1. STATE QUẢN LÝ DỮ LIỆU ---
  const [foods, setFoods] = useState([]);
  const [categories, setCategories] = useState([]); 
  const [banners, setBanners] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  // --- 2. STATE BỘ LỌC & TÌM KIẾM ---
  const [searchTerm, setSearchTerm] = useState(''); 
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortOption, setSortOption] = useState('default'); 
  const [currentPage, setCurrentPage] = useState(1);
  
  const ITEMS_PER_PAGE = 12; 
  const location = useLocation();

  // Helper Icon
  const getCategoryIcon = (name) => {
    const lowerName = name?.toLowerCase() || '';
    if (lowerName.includes('burger')) return <FaHamburger />;
    if (lowerName.includes('pizza')) return <FaPizzaSlice />;
    if (lowerName.includes('gà')) return <FaDrumstickBite />;
    if (lowerName.includes('nước') || lowerName.includes('uống')) return <FaMugHot />;
    if (lowerName.includes('combo')) return <FaBoxOpen />;
    if (lowerName.includes('phụ') || lowerName.includes('ăn vặt')) return <FaCookieBite />;
    return <FaUtensils />; 
  };

  // --- 3. FETCH DỮ LIỆU ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [foodRes, catRes, bannerRes] = await Promise.all([
            axiosClient.get('/MonAn'),
            axiosClient.get('/DanhMuc'),
            axiosClient.get('/QuangCao/Active') 
        ]);
        
        setFoods(Array.isArray(foodRes) ? foodRes : []);
        setBanners(Array.isArray(bannerRes) ? bannerRes : []);

        const rawCats = Array.isArray(catRes) ? catRes : [];
        const priorityOrder = ['Burger', 'Gà Rán', 'Pizza', 'Món Phụ', 'Đồ Uống', 'Combo'];
        
        const sortedCategories = rawCats.sort((a, b) => {
          let indexA = priorityOrder.indexOf(a.tenDanhMuc);
          let indexB = priorityOrder.indexOf(b.tenDanhMuc);
          if (indexA === -1) indexA = 99;
          if (indexB === -1) indexB = 99;
          return indexA - indexB;
        });

        setCategories([{ maDanhMuc: 'All', tenDanhMuc: 'Tất cả' }, ...sortedCategories]);
      } catch (err) {
        console.error('Lỗi tải dữ liệu Menu:', err);
        setFoods([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Xử lý URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const catIdFromUrl = params.get('category');
    if (catIdFromUrl) {
      const numericId = parseInt(catIdFromUrl);
      if (!isNaN(numericId)) setSelectedCategory(numericId);
    } else {
      setSelectedCategory('All');
    }
  }, [location.search]);

  // --- 4. LOGIC TÍNH GIÁ KHUYẾN MÃI (CHUẨN HÓA) ---
  const getPriceInfo = (item) => {
    if (!item) return { isSale: false, finalPrice: 0, originalPrice: 0, percent: 0 };
    const safeBanners = Array.isArray(banners) ? banners : [];

    const itemId = Number(item.maMon || item.MaMon);
    const itemCatId = Number(item.maDanhMuc || item.MaDanhMuc);
    const originalPrice = Number(item.gia || item.Gia || 0);

    const itemBanner = safeBanners.find(b => Number(b.maMon) === itemId && Number(b.phanTramGiam) > 0);
    const categoryBanner = safeBanners.find(b => {
        const bCatId = Number(b.maDanhMuc || 0);
        const bMonId = Number(b.maMon || 0);
        return bCatId === itemCatId && bMonId === 0 && Number(b.phanTramGiam) > 0; 
    });

    const appliedBanner = itemBanner || categoryBanner;

    if (appliedBanner) {
        const discountPercent = Number(appliedBanner.phanTramGiam || 0);
        if (discountPercent > 0) {
            return {
                isSale: true,
                originalPrice: originalPrice,
                finalPrice: originalPrice * (1 - discountPercent / 100),
                percent: discountPercent
            };
        }
    }
    return { isSale: false, originalPrice: originalPrice, finalPrice: originalPrice, percent: 0 };
  };

  // --- 5. LOGIC LỌC VÀ SẮP XẾP ---
  const filteredFoods = useMemo(() => {
    if (!Array.isArray(foods)) return [];

    let result = foods.filter((item) => {
      if (!item) return false;
      const matchesSearch = (item.tenMon || '').toLowerCase().includes(searchTerm.toLowerCase());
      const itemCatId = Number(item.maDanhMuc);
      const matchesCategory = selectedCategory === 'All' || itemCatId === Number(selectedCategory);
      return matchesSearch && matchesCategory;
    });

    // Sắp xếp
    if (sortOption === 'price-asc') {
        result.sort((a, b) => getPriceInfo(a).finalPrice - getPriceInfo(b).finalPrice);
    } else if (sortOption === 'price-desc') {
        result.sort((a, b) => getPriceInfo(b).finalPrice - getPriceInfo(a).finalPrice);
    } else if (sortOption === 'name-asc') {
        result.sort((a, b) => (a.tenMon || '').localeCompare(b.tenMon || ''));
    } else if (sortOption === 'name-desc') {
        result.sort((a, b) => (b.tenMon || '').localeCompare(a.tenMon || ''));
    } else if (sortOption === 'best-seller') {
        // 🔥 Sắp xếp theo số lượng bán thật (daBan hoặc da_ban)
        result.sort((a, b) => {
            const soldA = a.daBan || a.da_ban || 0;
            const soldB = b.daBan || b.da_ban || 0;
            return soldB - soldA;
        });
    }

    return result;
  }, [foods, searchTerm, selectedCategory, sortOption, banners]); 

  // Reset trang
  useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedCategory, sortOption]);

  const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
  const currentItems = filteredFoods.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredFoods.length / ITEMS_PER_PAGE);

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 400, behavior: 'smooth' });
  };

  const handleAddToCart = (item) => {
      const priceInfo = getPriceInfo(item);
      const itemToAdd = { 
          ...item, 
          gia: priceInfo.finalPrice,
          originalPrice: priceInfo.originalPrice,
          isSale: priceInfo.isSale,
          salePercent: priceInfo.percent
      };
      addToCart(itemToAdd);
  };

  return (
    <div style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', backgroundColor: '#f8f9fa', minHeight: '100vh', paddingBottom: '50px' }}>
      
      {/* HEADER MENU */}
      <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: '#fff', marginBottom: '30px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: '3.5rem', color: '#2d3436', margin: '0 0 10px 0' }}>
          Thực Đơn <span style={{ color: '#e64a19' }}>FastBite</span>
        </h1>
        <p style={{ color: '#636e72', fontSize: '1.1rem' }}>Khám phá hương vị tuyệt vời cùng công nghệ giao hàng siêu tốc</p>
        
        <div style={{ maxWidth: '1200px', margin: '40px auto 0', padding: '0 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '30px', maxWidth: '900px', margin: '0 auto 30px auto', flexWrap: 'wrap' }}>
            
            {/* THANH TÌM KIẾM */}
            <div style={{ flex: 1, position: 'relative', minWidth: '300px' }}>
              <FaSearch style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: '#b2bec3' }} />
              <input 
                type="text" 
                placeholder="Bạn đang thèm gì hôm nay?" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                style={{ width: '100%', height: '55px', padding: '0 20px 0 55px', borderRadius: '50px', border: '1px solid #dfe6e9', fontSize: '1rem', outline: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }} 
              />
            </div>

            {/* SẮP XẾP */}
            <div style={{ width: '240px', position: 'relative' }}>
               <FaSortAmountDown style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: '#e64a19', zIndex: 10 }} />
               <select value={sortOption} onChange={(e) => setSortOption(e.target.value)} style={{ width: '100%', height: '55px', padding: '0 35px 0 55px', borderRadius: '50px', border: '1px solid #dfe6e9', fontSize: '0.95rem', outline: 'none', appearance: 'none', cursor: 'pointer', backgroundColor: '#fff', fontWeight: '600' }}>
                  <option value="default">Sắp xếp mặc định</option>
                  <option value="best-seller">🔥 Bán chạy nhất</option> {/* Thêm option mới */}
                  <option value="price-asc">Giá: Thấp đến Cao</option>
                  <option value="price-desc">Giá: Cao đến Thấp</option>
                  <option value="name-asc">Tên: A - Z</option>
                  <option value="name-desc">Tên: Z - A</option>
               </select>
            </div>
          </div>

          {/* DANH MỤC */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '15px' }}>
            {categories.map((cat) => (
              <motion.button 
                key={cat.maDanhMuc} 
                onClick={() => setSelectedCategory(cat.maDanhMuc)} 
                whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }} 
                style={{ 
                    padding: '12px 28px', borderRadius: '50px', border: 'none', cursor: 'pointer', 
                    display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1rem', fontWeight: '600', 
                    backgroundColor: selectedCategory === cat.maDanhMuc ? '#e64a19' : '#f1f2f6', 
                    color: selectedCategory === cat.maDanhMuc ? '#fff' : '#2d3436', 
                    boxShadow: selectedCategory === cat.maDanhMuc ? '0 8px 15px rgba(230, 74, 25, 0.3)' : 'none', 
                    transition: '0.3s' 
                }}
              >
                {cat.maDanhMuc === 'All' ? <FaUtensils /> : getCategoryIcon(cat.tenDanhMuc)} 
                {cat.tenDanhMuc}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* LƯỚI SẢN PHẨM */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '100px' }}><div className="loader">Đang chuẩn bị món ăn ngon...</div></div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '30px' }}>
              {currentItems.map((item) => {
                const priceInfo = getPriceInfo(item); 
                // Lấy số lượng đã bán thật từ DB (daBan hoặc da_ban), nếu không có thì = 0
                const soldCount = item.daBan || item.da_ban || 0;

                return (
                    <motion.div key={item.maMon} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ backgroundColor: '#fff', borderRadius: '20px', boxShadow: '0 10px 20px rgba(0,0,0,0.05)', overflow: 'hidden', height: '480px', display: 'flex', flexDirection: 'column', position:'relative' }} whileHover={{ y: -10, boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
                    
                    {/* Tem Sale */}
                    {priceInfo.isSale && (
                        <div style={{
                            position: 'absolute', top: '15px', right: '15px', background: '#d63031', color: '#fff', 
                            padding: '5px 12px', borderRadius: '30px', fontWeight: 'bold', fontSize: '0.95rem', zIndex: 10, display: 'flex', alignItems: 'center', gap: '5px', boxShadow: '0 4px 10px rgba(214, 48, 49, 0.4)'
                        }}>
                            <FaTag size={12}/> -{priceInfo.percent}%
                        </div>
                    )}

                    {/* Ảnh Sản Phẩm */}
                    <div style={{ height: '280px', position: 'relative' }}>
                        <img 
                            src={getImageUrl(item.hinhAnh)} 
                            alt={item.tenMon} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            onError={(e) => { e.target.src = 'https://placehold.co/400x300?text=No+Image'; }} 
                        />
                        <motion.div initial={{ opacity: 0 }} whileHover={{ opacity: 1 }} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Link to={`/product-detail/${item.maMon}`}>
                            <button style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '50%', color: '#2d3436', border: 'none', cursor: 'pointer', display: 'flex' }}><FaEye size={22} /></button>
                        </Link>
                        </motion.div>
                    </div>

                    {/* Thông tin */}
                    <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <h3 style={{ fontSize: '1.2rem', margin: '0', color: '#2d3436', fontWeight: '700', lineHeight: '1.4' }}>{item.tenMon}</h3>
                            </div>
                            
                            {/* 🔥 HIỂN THỊ SỐ LIỆU THẬT THAY VÌ ĐÁNH GIÁ ẢO 🔥 */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop:'5px', fontSize: '0.9rem', color: '#636e72' }}>
                                {soldCount > 0 ? (
                                    <span style={{ color: '#00b894', display:'flex', alignItems:'center', gap:'5px', fontWeight:'600' }}>
                                        <FaCheckCircle size={12}/> Đã bán {soldCount}
                                    </span>
                                ) : (
                                    <span style={{ color: '#ffa502', display:'flex', alignItems:'center', gap:'5px' }}>
                                        <FaStar size={12}/> Món mới
                                    </span>
                                )}
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

                        <motion.button onClick={() => handleAddToCart(item)} whileTap={{ scale: 0.95 }} style={{ width: '100%', padding: '15px', backgroundColor: '#e64a19', color: '#fff', border: 'none', borderRadius: '15px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(230, 74, 25, 0.2)' }}>
                        <FaShoppingCart /> ĐẶT MÓN NGAY
                        </motion.button>
                    </div>
                    </motion.div>
                );
              })}
            </div>

            {/* PHÂN TRANG */}
            {filteredFoods.length > ITEMS_PER_PAGE && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '60px', gap: '12px' }}>
                <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} style={{ padding: '12px 20px', border: '1px solid #ddd', borderRadius: '12px', cursor: 'pointer', backgroundColor: '#fff', color: currentPage === 1 ? '#ccc' : '#333' }}>Trang trước</button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button key={i + 1} onClick={() => paginate(i + 1)} style={{ width: '45px', height: '45px', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', backgroundColor: currentPage === i + 1 ? '#e64a19' : '#fff', color: currentPage === i + 1 ? '#fff' : '#333', boxShadow: currentPage === i + 1 ? '0 5px 15px rgba(230, 74, 25, 0.3)' : 'none' }}>{i + 1}</button>
                ))}
                <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages} style={{ padding: '12px 20px', border: '1px solid #ddd', borderRadius: '12px', cursor: 'pointer', backgroundColor: '#fff', color: currentPage === totalPages ? '#ccc' : '#333' }}>Trang sau</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Menu;