import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaTrash, FaMinus, FaPlus, FaArrowLeft, FaShoppingBag } from 'react-icons/fa';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// ✅ IMPORT HỆ THỐNG CHUẨN
import axiosClient from '../../api/axiosClient';
import { getImageUrl } from '../../utils/imageHelper';

function Cart({ user }) {
  // --- STATE ---
  const [cartItems, setCartItems] = useState([]);
  const [banners, setBanners] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false); 
  const navigate = useNavigate();

  // --- HELPER: ĐỒNG BỘ LOCALSTORAGE ---
  const syncToLocalStorage = (items) => {
    localStorage.setItem('cartItems', JSON.stringify(items));
    window.dispatchEvent(new Event('cart-updated'));
  };

  // --- 1. FETCH DỮ LIỆU ---
  const fetchCartData = async () => {
      try {
        setLoading(true);

        // Lấy Banner
        const bannerRes = await axiosClient.get('/QuangCao/Active');
        setBanners(Array.isArray(bannerRes) ? bannerRes : []);

        // --- TRƯỜNG HỢP 1: ĐÃ ĐĂNG NHẬP ---
        if (user && (user.id || user.maNguoiDung)) {
          const userId = user.id || user.maNguoiDung;
          const cartRes = await axiosClient.get(`/GioHang/${userId}`);
          
          if (Array.isArray(cartRes) && cartRes.length > 0) {
            const normalizedCart = cartRes.map(item => ({
                ...item,
                // Fallback tên biến an toàn
                maMon: item.maMon || item.MaMon,
                tenMon: item.tenMon || item.TenMon,
                hinhAnh: item.hinhAnh || item.HinhAnh,
                gia: item.gia || item.Gia,
                soLuong: item.soLuong || item.quantity || 1,
                maDanhMuc: item.maDanhMuc || item.MaDanhMuc 
            }));
            setCartItems(normalizedCart);
            syncToLocalStorage(normalizedCart);
          } else {
            setCartItems([]);
            syncToLocalStorage([]);
          }
        } 
        // --- TRƯỜNG HỢP 2: KHÁCH VÃNG LAI ---
        else {
          const localCart = JSON.parse(localStorage.getItem('cartItems')) || [];
          setCartItems(Array.isArray(localCart) ? localCart : []);
        }

      } catch (err) {
        console.error("Lỗi tải giỏ hàng:", err);
        setCartItems([]);
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
    fetchCartData();
  }, [user]);

  // Lắng nghe sự kiện xóa giỏ hàng
  useEffect(() => {
      const handleCartCleared = () => {
          setCartItems([]);
          localStorage.removeItem('cartItems');
      };
      window.addEventListener('cart-cleared', handleCartCleared);
      return () => window.removeEventListener('cart-cleared', handleCartCleared);
  }, []);


  // --- 2. LOGIC TÍNH GIÁ (ĐÃ ĐỒNG BỘ CHUẨN 100% VỚI MENU & DETAIL) ---
  const calculatePrice = (item) => {
    // Ép kiểu Number để tránh lỗi so sánh chuỗi
    const itemId = Number(item.maMon || item.MaMon || 0);
    const itemCatId = Number(item.maDanhMuc || item.MaDanhMuc || 0);
    const originalPrice = Number(item.gia || item.Gia || 0);

    // 1. ƯU TIÊN 1: Tìm banner riêng cho Món
    // Điều kiện: maMon trùng khớp VÀ có phần trăm giảm > 0
    const itemBanner = banners.find(b => 
        Number(b.maMon) === itemId && Number(b.phanTramGiam) > 0
    );

    // 2. ƯU TIÊN 2: Tìm banner chung cho Danh mục
    // Điều kiện: maDanhMuc trùng khớp VÀ maMon == 0 (đại diện cả nhóm)
    const categoryBanner = banners.find(b => 
        Number(b.maDanhMuc) === itemCatId && Number(b.maMon) === 0 && Number(b.phanTramGiam) > 0
    );

    // 3. Chọn banner áp dụng: Món đè Danh mục
    const activeBanner = itemBanner || categoryBanner;

    if (activeBanner) {
        return {
            finalPrice: originalPrice * (1 - activeBanner.phanTramGiam / 100),
            originalPrice: originalPrice,
            isSale: true,
            percent: activeBanner.phanTramGiam
        };
    }
    // Không có khuyến mãi
    return { finalPrice: originalPrice, originalPrice: originalPrice, isSale: false, percent: 0 };
  };

  // --- 3. CÁC HÀM XỬ LÝ KHÁC (GIỮ NGUYÊN) ---
  const handleUpdateQuantity = async (maMon, currentQty, delta) => {
    const newQty = currentQty + delta;
    if (newQty < 1) return;

    const updatedCart = cartItems.map(item => 
        item.maMon === maMon ? { ...item, soLuong: newQty } : item
    );
    setCartItems(updatedCart);
    syncToLocalStorage(updatedCart);

    if (user) {
        setIsUpdating(true);
        try {
            await axiosClient.post('/GioHang/CapNhat', {
                maNguoiDung: user.id || user.maNguoiDung,
                maMon: maMon,
                soLuong: newQty
            });
        } catch (error) { console.error(error); } 
        finally { setIsUpdating(false); }
    }
  };

  const handleRemove = async (maMon) => {
    if (!window.confirm("Xóa món này?")) return;
    const newCart = cartItems.filter(item => item.maMon !== maMon);
    setCartItems(newCart);
    syncToLocalStorage(newCart);
    toast.info("Đã xóa", { autoClose: 1000, theme: "colored" });

    if (user) {
        try { await axiosClient.delete(`/GioHang/Xoa/${user.id || user.maNguoiDung}/${maMon}`); } 
        catch (error) { console.error(error); }
    }
  };

  const totalAmount = useMemo(() => {
    return cartItems.reduce((total, item) => {
        const { finalPrice } = calculatePrice(item);
        return total + (finalPrice * (item.soLuong || 1));
    }, 0);
  }, [cartItems, banners]);

  // --- 4. CHUYỂN TRANG THANH TOÁN (QUAN TRỌNG) ---
  const handleProceedToCheckout = () => {
    if (!user) {
        toast.warning("Vui lòng đăng nhập!", { theme: "colored" });
        return;
    }

    // Tính toán giá chốt hạ (đã giảm) để gửi sang trang Checkout
    // Trang Checkout chỉ việc hiển thị, không cần tính lại nữa -> Tránh lệch giá
    const checkoutData = cartItems.map(item => {
        const { finalPrice } = calculatePrice(item); 
        return {
            ...item,
            gia: finalPrice, // Ghi đè giá gốc bằng giá đã giảm
            giaGoc: item.gia // Lưu lại giá gốc (nếu cần hiển thị tham khảo)
        };
    });

    localStorage.setItem('checkoutItems', JSON.stringify(checkoutData));
    navigate('/checkout');
  };

  // --- RENDER ---
  if (loading) return <div style={{ minHeight:'60vh', display:'flex', justifyContent:'center', alignItems:'center' }}><div className="loader">Loading...</div></div>;

  return (
    <div style={{ padding: '40px 20px', background: '#f8f9fa', minHeight: '100vh', fontFamily: '"Poppins", sans-serif' }}>
      <ToastContainer />
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '30px', color: '#2d3436' }}>Giỏ Hàng Của Bạn 🛒</h2>

        {cartItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', background: '#fff', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
            <FaShoppingBag size={60} color="#e64a19" style={{ marginBottom:'20px', opacity:0.5 }} />
            <p style={{ fontSize: '1.2rem', color: '#636e72', marginBottom: '30px' }}>Giỏ hàng đang trống trơn!</p>
            <Link to="/menu" style={{ background: '#e64a19', color: '#fff', padding: '12px 30px', borderRadius: '50px', textDecoration: 'none', fontWeight: 'bold' }}>Xem Thực Đơn</Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
            
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ background: '#fff', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 5px 15px rgba(0,0,0,0.03)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: '#f1f2f6', color: '#2d3436' }}>
                    <tr>
                      <th style={{ padding: '15px', textAlign: 'left' }}>Món Ăn</th>
                      <th style={{ padding: '15px', textAlign: 'center' }}>Đơn Giá</th>
                      <th style={{ padding: '15px', textAlign: 'center' }}>Số Lượng</th>
                      <th style={{ padding: '15px', textAlign: 'center' }}>Thành Tiền</th>
                      <th style={{ padding: '15px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cartItems.map((item) => {
                      const { finalPrice, originalPrice, isSale, percent } = calculatePrice(item);
                      
                      return (
                        <tr key={item.maMon} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '15px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <img src={getImageUrl(item.hinhAnh)} alt={item.tenMon} style={{ width: '70px', height: '70px', borderRadius: '10px', objectFit: 'cover' }} onError={(e) => e.target.src='https://placehold.co/70?text=Food'}/>
                            <div>
                                <div style={{ fontWeight: '700', color: '#2d3436' }}>{item.tenMon}</div>
                                {isSale && <span style={{ fontSize: '0.75rem', background: '#ff7675', color: '#fff', padding: '2px 6px', borderRadius: '4px' }}>Giảm {percent}%</span>}
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ fontWeight: '600', color: '#2d3436' }}>{finalPrice.toLocaleString()} đ</div>
                            {isSale && <div style={{ fontSize: '0.85rem', textDecoration: 'line-through', color: '#b2bec3' }}>{originalPrice.toLocaleString()} đ</div>}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', background: '#f5f6fa', borderRadius: '30px', padding: '5px 10px' }}>
                                <button onClick={() => handleUpdateQuantity(item.maMon, item.soLuong, -1)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#2d3436' }}><FaMinus size={10} /></button>
                                <span style={{ margin: '0 12px', fontWeight: 'bold', minWidth: '20px' }}>{item.soLuong}</span>
                                <button onClick={() => handleUpdateQuantity(item.maMon, item.soLuong, 1)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#2d3436' }}><FaPlus size={10} /></button>
                            </div>
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#e64a19' }}>
                            {(finalPrice * item.soLuong).toLocaleString()} đ
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button onClick={() => handleRemove(item.maMon)} style={{ border: 'none', background: 'transparent', color: '#b2bec3', cursor: 'pointer', transition: '0.2s' }}><FaTrash /></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Link to="/menu" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '20px', textDecoration: 'none', color: '#636e72', fontWeight: '600' }}><FaArrowLeft /> Tiếp tục chọn món</Link>
            </div>

            <div style={{ minWidth: '300px' }}>
                <div style={{ background: '#fff', padding: '30px', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', position: 'sticky', top: '20px' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '20px', color: '#2d3436' }}>Tổng Quan Đơn Hàng</h3>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', color: '#636e72' }}><span>Tạm tính:</span><span>{totalAmount.toLocaleString()} đ</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', color: '#636e72' }}><span>Phí giao hàng:</span><span style={{ color: '#00b894', fontWeight: 'bold' }}>Miễn phí</span></div>
                    <div style={{ borderTop: '2px dashed #dfe6e9', margin: '20px 0' }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', alignItems: 'center' }}><span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Tổng cộng:</span><span style={{ color: '#e64a19', fontSize: '1.5rem', fontWeight: '800' }}>{totalAmount.toLocaleString()} đ</span></div>
                    
                    <button 
                        onClick={handleProceedToCheckout} 
                        style={{ width: '100%', padding: '15px', background: '#e64a19', color: '#fff', border: 'none', borderRadius: '50px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 10px 20px rgba(230, 74, 25, 0.3)' }}
                    >
                        Tiến Hành Thanh Toán
                    </button>
                </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

export default Cart;