import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  FaMinus, FaPlus, FaShoppingCart, FaStar, FaHeart, 
  FaCheckCircle, FaShippingFast, FaStore, FaChevronRight, FaTag, FaEye, FaUserCircle
} from 'react-icons/fa';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// ✅ IMPORT CHUẨN TỪ HỆ THỐNG
import axiosClient from '../../api/axiosClient'; 
import { getImageUrl } from '../../utils/imageHelper';

function ProductDetail({ addToCart }) {
  const { productId } = useParams();
  const navigate = useNavigate();
  
  // --- STATE ---
  const [product, setProduct] = useState(null);
  const [banners, setBanners] = useState([]);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [reviews, setReviews] = useState([]); 
  const [userRating, setUserRating] = useState(5); // Mặc định 5 sao
  const [userComment, setUserComment] = useState(''); // Lời bình
  const [isSubmitting, setIsSubmitting] = useState(false); // Trạng thái đang gửi
  const [loading, setLoading] = useState(true);
  const [mainImage, setMainImage] = useState(''); 
  const [activeTab, setActiveTab] = useState('desc');

  
  // State số liệu thật
  const [realSold, setRealSold] = useState(0);
  const [quantity, setQuantity] = useState(1); 

  // --- 1. FETCH DỮ LIỆU (CHẾ ĐỘ AN TOÀN) ---
  useEffect(() => {
    const fetchData = async () => {
        try {
            window.scrollTo(0, 0); 
            setLoading(true);
            setQuantity(1); 

            // 1. Lấy dữ liệu QUAN TRỌNG trước (Sản phẩm, Quảng cáo, Menu)
            // Nếu mấy cái này lỗi thì mới báo lỗi trang
            const [prodRes, bannerRes, allFoodsRes] = await Promise.all([
                axiosClient.get(`/MonAn/${productId}`),
                axiosClient.get(`/QuangCao/Active`),
                axiosClient.get(`/MonAn`)
            ]);

            const safeProduct = prodRes || null;
            const safeBanners = Array.isArray(bannerRes) ? bannerRes : [];
            const safeAllFoods = Array.isArray(allFoodsRes) ? allFoodsRes : [];

            setProduct(safeProduct);
            setBanners(safeBanners);

            if (safeProduct) {
                // Setup ảnh
                const firstImg = safeProduct.hinhAnh || (safeProduct.hinhAnhMonAns?.[0]?.duongDan);
                setMainImage(getImageUrl(firstImg));

                // Số lượng đã bán
                const soldCount = safeProduct.daBan || safeProduct.DaBan || safeProduct.sold || safeProduct.da_ban || 0;
                setRealSold(soldCount);

                // Lọc sản phẩm liên quan
                const currentCatId = Number(safeProduct.maDanhMuc || safeProduct.MaDanhMuc || 0);
                const currentId = Number(safeProduct.maMon || safeProduct.MaMon || safeProduct.id);

                let related = safeAllFoods.filter(item => {
                    const itemCatId = Number(item.maDanhMuc || item.MaDanhMuc);
                    const itemId = Number(item.maMon || item.MaMon || item.id);
                    return itemCatId === currentCatId && itemId !== currentId;
                });

                if (related.length === 0 && safeAllFoods.length > 0) {
                    related = safeAllFoods
                        .filter(item => Number(item.maMon || item.MaMon) !== currentId)
                        .sort(() => 0.5 - Math.random())
                        .slice(0, 4);
                } else {
                    related = related.slice(0, 4);
                }
                setRelatedProducts(related);

                // 2. Lấy ĐÁNH GIÁ (RIÊNG BIỆT)
                // Nếu API này chưa có hoặc lỗi, web VẪN CHẠY bình thường
                // --- Tìm và thay thế đoạn lấy đánh giá trong useEffect của ProductDetail.jsx ---
try {
    const reviewRes = await axiosClient.get(`/DanhGia`);
    
    // ✅ Kiểm tra dữ liệu trả về: lấy trực tiếp hoặc từ .data
    const allReviews = Array.isArray(reviewRes) ? reviewRes : (reviewRes?.data || []);
    
    // ✅ Debug: Bạn hãy F12 trên trình duyệt, vào tab Console để xem API trả về gì nhé
    console.log("Dữ liệu đánh giá từ API:", allReviews);
    console.log("ID món hiện tại:", currentId);

    // ✅ Lọc đánh giá với logic linh hoạt hơn
    const productReviews = allReviews.filter(r => {
        const itemID = r.ma_mon || r.maMon || r.MaMon || r.maMonAn;
        return Number(itemID) === Number(currentId);
    });

    setReviews(productReviews);
} catch (reviewError) {
    console.error("⚠️ Lỗi API Đánh giá:", reviewError);
    setReviews([]); 
}
            }

        } catch (err) {
            console.error("❌ Lỗi tải sản phẩm chính:", err);
            setProduct(null); 
        } finally {
            setLoading(false);
        }
    };
    fetchData();
  }, [productId]);

  // --- 2. TÍNH TOÁN GIÁ ---
  const calculatePrice = (item) => {
    if (!item) return { isSale: false, finalPrice: 0, originalPrice: 0, percent: 0 };
    const safeBanners = Array.isArray(banners) ? banners : [];
    const itemId = Number(item.maMon || item.MaMon || item.id || 0);
    const itemCatId = Number(item.maDanhMuc || item.MaDanhMuc || 0);
    const originalPrice = Number(item.gia || item.Gia || 0);

    const itemBanner = safeBanners.find(b => Number(b.maMon) === itemId && Number(b.phanTramGiam) > 0);
    const categoryBanner = safeBanners.find(b => Number(b.maDanhMuc) === itemCatId && Number(b.maMon) === 0 && Number(b.phanTramGiam) > 0);
    const appliedBanner = itemBanner || categoryBanner;

    if (appliedBanner) {
        return {
            isSale: true,
            originalPrice: originalPrice,
            finalPrice: originalPrice * (1 - appliedBanner.phanTramGiam / 100),
            percent: appliedBanner.phanTramGiam
        };
    }
    return { isSale: false, originalPrice: originalPrice, finalPrice: originalPrice, percent: 0 };
  };

  const priceInfo = useMemo(() => calculatePrice(product), [product, banners]);

 // --- TÍNH ĐIỂM TRUNG BÌNH SAO ---
  const averageRating = useMemo(() => {
      if (reviews.length === 0) return 5; // Mặc định 5 sao nếu chưa có đánh giá
      const totalStars = reviews.reduce((sum, r) => sum + (Number(r.soSao || r.so_sao) || 5), 0);
      return (totalStars / reviews.length).toFixed(1);
  }, [reviews]);

  // --- 3. XỬ LÝ GIỎ HÀNG ---
  const handleAddToCart = (isBuyNow = false) => {
      if (!product) return;
      const itemToAdd = {
          ...product,
          maMon: product.maMon || product.MaMon || product.id, 
          tenMon: product.tenMon || product.TenMon || product.name,
          hinhAnh: product.hinhAnh || product.HinhAnh || product.image,
          gia: priceInfo.finalPrice, 
          originalPrice: priceInfo.originalPrice, 
          isSale: priceInfo.isSale,
          salePercent: priceInfo.percent,
          soLuong: quantity
      };
      addToCart(itemToAdd);
      if (isBuyNow) navigate('/cart');
      else toast.success(`Đã thêm ${quantity} sản phẩm vào giỏ!`, { position: "top-center", autoClose: 1500, theme: "colored" });
  };

  const handleQuantityChange = (delta) => setQuantity(prev => Math.max(1, prev + delta));
  
  // --- HÀM GỬI ĐÁNH GIÁ (CHUẨN JWT - DÙNG TOKEN) ---
  const handleSubmitReview = async () => {
      // 1. Validate nội dung
      if (!userComment.trim()) {
          toast.warning("Bạn chưa viết nhận xét nào! ✍️");
          return;
      }

      // 2. Lấy Token từ Local Storage
      // (Lưu ý: Tên key trong ảnh của bạn là "accessToken")
      const token = localStorage.getItem('accessToken'); 
      
      if (!token) {
          toast.warning("Phiên đăng nhập hết hạn, vui lòng đăng nhập lại! 🔒");
          return;
      }

      // 3. Chuẩn bị dữ liệu (KHÔNG CẦN GỬI MaNguoiDung NỮA)
      // Backend sẽ tự trích xuất ID từ Token
      const newReview = {
          maMon: product.maMon || product.id,
          soSao: userRating,
          nhanXet: userComment
          // ngayDanhGia: Backend tự tạo
      };

      try {
          setIsSubmitting(true);
          
          // 4. Gửi Request kèm Token trong Header
          await axiosClient.post('/DanhGia', newReview, {
              headers: {
                  'Authorization': `Bearer ${token}` // 👈 Đây là cách gửi chuẩn quốc tế
              }
          });
          
          toast.success("Đánh giá thành công! 🎉");
          
          // Reset và reload
          setUserComment('');
          setUserRating(5);
          
          const res = await axiosClient.get('/DanhGia');
          const allReviews = Array.isArray(res) ? res : (res?.data || []);
          const currentReviews = allReviews.filter(r => {
                const itemID = r.maMon || r.MaMon || r.ma_mon;
                return Number(itemID) === Number(newReview.maMon);
          });
          setReviews(currentReviews);

      } catch (error) {
          console.error("Lỗi:", error);
          if (error.response) {
              // 401: Token hết hạn hoặc sai
              if (error.response.status === 401) {
                  toast.error("Vui lòng đăng nhập lại để đánh giá!");
              } 
              // 400: Lỗi logic (chưa mua hàng...)
              else if (error.response.status === 400) {
                  toast.error(error.response.data.message || "Không thể đánh giá!");
              } else {
                  toast.error("Lỗi hệ thống!");
              }
          }
      } finally {
          setIsSubmitting(false);
      }
  };

  // ✅ HÀM RENDER SAO (ĐÃ THÊM LẠI ĐỂ SỬA LỖI)
  const renderStars = (rating) => {
      return [...Array(5)].map((_, i) => (
          <FaStar key={i} size={14} color={i < Math.round(rating) ? "#ffa502" : "#dfe6e9"} />
      ));
  };

  if (loading) return <div style={{ minHeight:'80vh', display:'flex', justifyContent:'center', alignItems:'center', fontSize:'1.2rem', color:'#666' }}>Đang tải món ngon... 🍔</div>;
  if (!product) return <div style={{ textAlign:'center', padding:'100px 20px', minHeight:'80vh' }}><img src="https://cdni.iconscout.com/illustration/premium/thumb/product-not-found-3298708-2753337.png" alt="404" style={{width:'200px'}}/><h3>Không tìm thấy sản phẩm!</h3><Link to="/menu" style={{color:'#e64a19', fontWeight:'bold'}}>Quay lại thực đơn</Link></div>;

  const thumbnails = [product.hinhAnh, ...(product.hinhAnhMonAns?.map(img => img.duongDan) || [])].filter(Boolean);

  return (
    <div style={{ background: '#f8f9fa', minHeight: '100vh', paddingBottom: '60px', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
      <ToastContainer />
      <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#999', fontSize: '0.9rem', marginBottom: '20px' }}>
            <Link to="/" style={{ textDecoration: 'none', color: '#666' }}>Trang chủ</Link> 
            <FaChevronRight size={10} />
            <Link to="/menu" style={{ textDecoration: 'none', color: '#666' }}>Thực đơn</Link>
            <FaChevronRight size={10} />
            <span style={{ color: '#e64a19', fontWeight: '600' }}>{product.tenMon}</span>
        </div>

        {/* --- KHỐI CHÍNH --- */}
        <div style={{ background: '#fff', borderRadius: '20px', boxShadow: '0 5px 20px rgba(0,0,0,0.03)', padding: '30px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '40px' }}>
          
          {/* Cột Trái: Ảnh */}
          <div>
            <div style={{ position: 'relative', borderRadius: '15px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', marginBottom: '15px', border:'1px solid #eee' }}>
                <img src={mainImage} alt={product.tenMon} style={{ width: '100%', height: '450px', objectFit: 'cover', transition: 'transform 0.5s' }} className="zoom-hover" onError={(e) => { e.target.src = 'https://placehold.co/600x600?text=No+Image'; }} />
                <div style={{ position: 'absolute', top: '15px', left: '15px', display:'flex', flexDirection:'column', gap:'10px' }}>
                    {product.banChay && <span style={{ background: '#ff4757', color: '#fff', padding: '6px 14px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(255, 71, 87, 0.4)' }}>🔥 Hot Seller</span>}
                    {priceInfo.isSale && <span style={{ background: '#e64a19', color: '#fff', padding: '6px 14px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 'bold' }}>-{priceInfo.percent}% OFF</span>}
                </div>
            </div>
            {thumbnails.length > 1 && (
                <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom:'5px' }}>
                    {thumbnails.map((img, idx) => (
                        <img key={idx} src={getImageUrl(img)} alt="thumb" onClick={() => setMainImage(getImageUrl(img))} style={{ width: '80px', height: '80px', borderRadius: '10px', objectFit: 'cover', cursor: 'pointer', border: mainImage === getImageUrl(img) ? '2px solid #e64a19' : '2px solid transparent', opacity: mainImage === getImageUrl(img) ? 1 : 0.6, transition: '0.2s' }} />
                    ))}
                </div>
            )}
          </div>

          {/* Cột Phải: Thông tin */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <span style={{ color: '#e64a19', fontWeight: '700', fontSize: '0.85rem', letterSpacing: '1px', textTransform: 'uppercase' }}>FASTBITE EXCLUSIVE</span>
                    <h1 style={{ fontSize: '2.4rem', fontWeight: '800', color: '#2d3436', margin: '5px 0 10px', lineHeight: '1.2' }}>{product.tenMon}</h1>
                </div>
                <button style={{ background: '#fff0f3', border: 'none', borderRadius: '50%', width: '45px', height: '45px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#ff4757', transition:'0.3s' }}> <FaHeart size={20} /> </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', color: '#636e72', fontSize: '0.95rem', marginBottom: '20px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#ffa502', fontWeight:'bold' }}>
                    {averageRating} <FaStar /> 
                    <span style={{fontWeight:'400', color:'#999'}}>({reviews.length} đánh giá)</span>
                </span>
                
                {realSold > 0 && (
                    <>
                        <span style={{ width: '1px', height: '15px', background: '#ddd' }}></span>
                        <span style={{ color: '#00b894', fontWeight: '600', display:'flex', alignItems:'center', gap:'5px' }}>
                            <FaCheckCircle size={14}/> Đã bán {realSold}
                        </span>
                    </>
                )}
            </div>

            <div style={{ background: '#fff9f5', padding: '20px', borderRadius: '15px', display: 'flex', alignItems: 'flex-end', gap: '15px', marginBottom: '25px', border:'1px dashed #e64a19' }}>
                {priceInfo.isSale ? (
                    <>
                        <span style={{ fontSize: '2.2rem', fontWeight: '800', color: '#e64a19', lineHeight: 1 }}>{priceInfo.finalPrice.toLocaleString()} đ</span>
                        <div style={{ display:'flex', flexDirection:'column' }}>
                            <span style={{ fontSize: '1.1rem', color: '#b2bec3', textDecoration: 'line-through', fontWeight: '500' }}>{priceInfo.originalPrice.toLocaleString()} đ</span>
                            <span style={{ fontSize: '0.8rem', color: '#d63031', fontWeight: 'bold' }}>Tiết kiệm: {(priceInfo.originalPrice - priceInfo.finalPrice).toLocaleString()} đ</span>
                        </div>
                    </>
                ) : (
                    <span style={{ fontSize: '2.2rem', fontWeight: '800', color: '#e64a19', lineHeight: 1 }}>{priceInfo.finalPrice.toLocaleString()} đ</span>
                )}
            </div>

            <p style={{ color: '#636e72', lineHeight: '1.6', marginBottom: '30px', fontSize: '1rem' }}>
                {product.moTa || "Hương vị tuyệt hảo được chế biến từ những nguyên liệu tươi ngon nhất. Đặt ngay để thưởng thức nóng hổi!"}
            </p>

            <div style={{ marginBottom: '30px' }}>
                <span style={{ display:'block', marginBottom:'10px', fontWeight:'600', color:'#2d3436' }}>Số lượng:</span>
                <div style={{ display: 'inline-flex', alignItems: 'center', background: '#f5f6fa', borderRadius: '30px', padding: '8px 15px', border:'1px solid #dfe6e9' }}>
                    <button onClick={() => handleQuantityChange(-1)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding:'5px' }}><FaMinus color="#636e72"/></button>
                    <span style={{ margin: '0 15px', fontWeight: 'bold', fontSize:'1.1rem', minWidth:'20px', textAlign:'center' }}>{quantity}</span>
                    <button onClick={() => handleQuantityChange(1)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding:'5px' }}><FaPlus color="#636e72"/></button>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: 'auto' }}>
                <button onClick={() => handleAddToCart(false)} style={{ flex: 1, background: '#fff', border: '2px solid #e64a19', color: '#e64a19', padding: '15px', borderRadius: '50px', fontWeight: '700', cursor: 'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', transition:'0.2s' }} onMouseOver={e => e.target.style.background = '#fff5f2'} onMouseOut={e => e.target.style.background = '#fff'}>
                    <FaShoppingCart /> Thêm vào giỏ
                </button>
                <button onClick={() => handleAddToCart(true)} style={{ flex: 1, background: '#e64a19', border: 'none', color: '#fff', padding: '15px', borderRadius: '50px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 10px 20px rgba(230, 74, 25, 0.3)', transition:'0.2s' }} onMouseOver={e => e.target.style.transform = 'translateY(-2px)'} onMouseOut={e => e.target.style.transform = 'translateY(0)'}>
                    Mua Ngay
                </button>
            </div>

            <div style={{ marginTop: '25px', display: 'flex', gap: '20px', fontSize: '0.85rem', color: '#636e72', borderTop:'1px solid #eee', paddingTop:'20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><FaShippingFast color="#e64a19"/> Giao hàng 30 phút</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><FaStore color="#e64a19"/> Đổi trả miễn phí</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><FaCheckCircle color="#e64a19"/> 100% Chính hãng</div>
            </div>
          </div>
        </div>

        {/* --- TABS --- */}
        <div style={{ marginTop: '40px', background: '#fff', borderRadius: '20px', padding: '30px', boxShadow: '0 5px 20px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', borderBottom: '1px solid #eee', marginBottom: '20px' }}>
                {['desc', 'review', 'policy'].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '15px 30px', background: 'none', border: 'none', fontSize: '1rem', fontWeight: '700', color: activeTab === tab ? '#e64a19' : '#999', borderBottom: activeTab === tab ? '3px solid #e64a19' : '3px solid transparent', cursor: 'pointer', transition:'0.3s' }}>
                        {tab === 'desc' ? 'Mô Tả Sản Phẩm' : tab === 'review' ? `Đánh Giá (${reviews.length})` : 'Chính Sách'}
                    </button>
                ))}
            </div>
            
            {/* --- NỘI DUNG TAB --- */}
                <div style={{ minHeight: '150px', color: '#555', lineHeight: '1.7' }}>
                    {activeTab === 'desc' && <div className="fade-in"><p>{product.moTa || "Chưa có mô tả."}</p></div>}
                    
                    {/* 🔥 TAB ĐÁNH GIÁ (ĐÃ THÊM FORM) 🔥 */}
                    {activeTab === 'review' && (
                        <div className="fade-in">
                            
                            {/* 1. Form Viết Đánh Giá */}
                            <div style={{ background: '#f8f9fa', padding: '25px', borderRadius: '15px', marginBottom: '30px', border: '1px solid #eee' }}>
                                <h4 style={{ margin: '0 0 15px', color: '#2d3436' }}>Viết đánh giá của bạn</h4>
                                
                                {/* Chọn Sao */}
                                <div style={{ marginBottom: '15px', display:'flex', gap:'10px', alignItems:'center' }}>
                                    <span style={{fontWeight:'600', color:'#636e72'}}>Chất lượng:</span>
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <FaStar 
                                            key={star} 
                                            size={24} 
                                            style={{ cursor: 'pointer', transition:'0.2s' }}
                                            color={star <= userRating ? "#ffa502" : "#dfe6e9"}
                                            onClick={() => setUserRating(star)}
                                            onMouseOver={e => e.currentTarget.style.transform = 'scale(1.2)'}
                                            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                                        />
                                    ))}
                                    <span style={{marginLeft:'10px', fontWeight:'bold', color:'#ffa502'}}>{userRating} Sao</span>
                                </div>

                                {/* Ô Nhập Nội Dung */}
                                <textarea 
                                    value={userComment}
                                    onChange={(e) => setUserComment(e.target.value)}
                                    placeholder="Món ăn này thế nào? Hãy chia sẻ cảm nhận của bạn nhé..."
                                    style={{ width: '100%', padding: '15px', borderRadius: '10px', border: '1px solid #ddd', minHeight: '100px', fontSize: '0.95rem', fontFamily:'inherit', resize:'vertical' }}
                                />

                                {/* Nút Gửi */}
                                <div style={{ textAlign: 'right', marginTop: '15px' }}>
                                    <button 
                                        onClick={handleSubmitReview}
                                        disabled={isSubmitting}
                                        style={{ background: isSubmitting ? '#ccc' : '#e64a19', color: '#fff', border: 'none', padding: '12px 30px', borderRadius: '50px', fontWeight: 'bold', cursor: isSubmitting ? 'not-allowed' : 'pointer', transition: '0.3s', boxShadow: '0 5px 15px rgba(230, 74, 25, 0.2)' }}
                                    >
                                        {isSubmitting ? 'Đang gửi...' : 'Gửi Đánh Giá'}
                                    </button>
                                </div>
                            </div>

                            {/* 2. Danh Sách Đánh Giá */}
                            <h4 style={{borderBottom:'1px solid #eee', paddingBottom:'10px', marginBottom:'20px'}}>Đánh giá từ khách hàng ({reviews.length})</h4>
                            
                            {reviews.length > 0 ? (
                                reviews.map((rev, index) => (
                                    <div key={rev.maDanhGia || index} style={{ display:'flex', alignItems:'flex-start', gap:'15px', marginBottom:'20px', paddingBottom:'20px', borderBottom:'1px dashed #eee' }}>
                                        <div style={{width:'50px', height:'50px', background:'#eee', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center'}}>
                                            <FaUserCircle size={30} color="#b2bec3"/>
                                        </div>
                                        <div style={{flex:1}}>
                                            <div style={{display:'flex', justifyContent:'space-between'}}>
                                                <span style={{ fontWeight:'bold', color:'#2d3436' }}>{rev.tenHienThi || `Khách hàng #${rev.maNguoiDung}`}</span>
                                                <span style={{ fontSize:'0.85rem', color:'#999' }}>{new Date(rev.ngayDanhGia || rev.ngay_danh_gia || Date.now()).toLocaleDateString('vi-VN')}</span>
                                            </div>
                                            <div style={{display:'flex', gap:'2px', margin:'5px 0'}}>{renderStars(rev.soSao || rev.so_sao || 5)}</div>
                                            <p style={{ margin: 0, color:'#636e72', fontSize:'0.95rem' }}>{rev.nhanXet || rev.nhan_xet}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div style={{textAlign:'center', color:'#999', padding:'20px'}}>Chưa có đánh giá nào. Hãy là người đầu tiên! 😊</div>
                            )}
                        </div>
                    )}

                    {activeTab === 'policy' && <div className="fade-in"><p>🚚 Giao hàng miễn phí...</p></div>}
                </div>
        </div>

        {/* --- SẢN PHẨM LIÊN QUAN --- */}
        <div style={{ marginTop: '50px' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#2d3436', marginBottom: '25px', display:'flex', alignItems:'center', gap:'10px' }}>
                <span style={{width:'5px', height:'25px', background:'#e64a19', display:'inline-block', borderRadius:'5px'}}></span>
                Món ngon cùng loại 😋
            </h3>
            {relatedProducts.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '30px' }}>
                    {relatedProducts.map(item => {
                        const relatedPrice = calculatePrice(item);
                        const soldCount = item.daBan || item.da_ban || 0;

                        return (
                            <div key={item.maMon || item.id} 
                                style={{ backgroundColor: '#fff', borderRadius: '20px', boxShadow: '0 10px 20px rgba(0,0,0,0.05)', overflow: 'hidden', height: '440px', display: 'flex', flexDirection: 'column', position:'relative', transition: 'transform 0.3s' }} 
                                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-10px)'} 
                                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                                {item.banChay && <div style={{ position: 'absolute', top: '15px', left: '15px', background: '#ff4757', color: '#fff', padding: '4px 10px', borderRadius: '30px', fontSize: '0.75rem', fontWeight: 'bold', zIndex: 10 }}>HOT</div>}
                                
                                <div style={{ height: '220px', position: 'relative', overflow: 'hidden' }}>
                                    <img src={getImageUrl(item.hinhAnh)} alt={item.tenMon} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s' }} className="hover-zoom" onError={(e) => { e.target.src = 'https://placehold.co/400x300?text=No+Image'; }} />
                                    <Link to={`/product-detail/${item.maMon || item.id}`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 5 }} title="Xem chi tiết"></Link>
                                </div>

                                <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                    <div>
                                        <h3 style={{ fontSize: '1.1rem', margin: '0 0 8px 0', color: '#2d3436', fontWeight: '700', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.tenMon || item.name}</h3>
                                        <div style={{ fontSize: '0.85rem', color: '#636e72', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            {soldCount > 0 ? <span style={{ color: '#00b894', display:'flex', alignItems:'center', gap:'3px' }}><FaCheckCircle size={12}/> Đã bán {soldCount}</span> : <span style={{ color: '#ffa502', fontStyle: 'italic' }}>Món mới lên sàn</span>}
                                        </div>
                                        <div>
                                            {relatedPrice.isSale ? (
                                                <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                                    <span style={{ color: '#d63031', fontSize: '1.2rem', fontWeight: '800' }}>{relatedPrice.finalPrice.toLocaleString()} đ</span>
                                                    <span style={{ color: '#b2bec3', fontSize: '0.9rem', textDecoration: 'line-through' }}>{relatedPrice.originalPrice.toLocaleString()} đ</span>
                                                </div>
                                            ) : (
                                                <p style={{ color: '#e64a19', fontSize: '1.2rem', fontWeight: '800', margin: 0 }}>{item.gia?.toLocaleString()} đ</p>
                                            )}
                                        </div>
                                    </div>
                                    <Link to={`/product-detail/${item.maMon || item.id}`} style={{ width: '100%', marginTop: '15px' }}>
                                        <button style={{ width: '100%', padding: '10px', backgroundColor: '#fff', color: '#e64a19', border: '1px solid #e64a19', borderRadius: '50px', fontWeight: '700', cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }} onMouseOver={e => {e.target.style.background='#e64a19'; e.target.style.color='#fff'}} onMouseOut={e => {e.target.style.background='#fff'; e.target.style.color='#e64a19'}}>
                                            <FaEye /> Xem Chi Tiết
                                        </button>
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div style={{textAlign: 'center', padding: '20px', color: '#999'}}>Đang cập nhật thêm món ngon... 🍽️</div>
            )}
        </div>

      </div>
      <style>{`.fade-in { animation: fadeIn 0.5s ease-in-out; } @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } .zoom-hover:hover { transform: scale(1.05); }`}</style>
    </div>
  );
}

export default ProductDetail;