import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// ✅ IMPORT CHUẨN TỪ HỆ THỐNG
import axiosClient from '../../api/axiosClient';

function Checkout({ clearCart }) {
  const navigate = useNavigate();
  
  // ✅ 1. LẤY USER AN TOÀN
  const user = useMemo(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch { return null; }
  }, []);

  const SHIP_FEE = 0; // Miễn phí ship cho đẹp

  // --- STATE ---
  const [checkoutItems, setCheckoutItems] = useState([]);
  const [summary, setSummary] = useState({ tamTinh: 0, tongCong: 0 });
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [isLoading, setIsLoading] = useState(false); 

  const [formData, setFormData] = useState({
    nguoiNhan: user?.hoTen || '',
    soDienThoai: user?.soDienThoai || '',
    diaChiGiaoHang: '', // Sẽ bind vào input địa chỉ
    ghiChu: '',
    phuongThuc: 'COD'
  });

  // --- 2. KHỞI TẠO DỮ LIỆU ---
  useEffect(() => {
    if (!user) {
      toast.warning("Vui lòng đăng nhập để thanh toán!");
      navigate('/login');
      return;
    }

    // 👇👇👇 LOGIC LẤY DỮ LIỆU GIỎ HÀNG CHUẨN XÁC 👇👇👇
    const loadCartData = () => {
        let itemsToCheckout = [];
        try {
            // 1. Ưu tiên lấy từ 'checkoutItems' (Dữ liệu đã được tính toán kỹ ở trang Cart)
            const rawCheckout = localStorage.getItem('checkoutItems');
            if (rawCheckout) {
                itemsToCheckout = JSON.parse(rawCheckout);
            } 
            // 2. Fallback: Nếu không có, lấy từ 'cartItems' thường
            else {
                const rawCart = localStorage.getItem('cartItems');
                itemsToCheckout = rawCart ? JSON.parse(rawCart) : [];
            }
        } catch (e) {
            console.error("Lỗi đọc giỏ hàng:", e);
            itemsToCheckout = [];
        }

        if (!Array.isArray(itemsToCheckout) || itemsToCheckout.length === 0) {
            toast.info("Giỏ hàng trống, hãy chọn món trước nhé!");
            navigate('/menu');
            return;
        }

        // 3. Chuẩn hóa dữ liệu lần cuối để đảm bảo không bị lỗi tính toán
        const cleanCart = itemsToCheckout.map(item => ({
            ...item,
            // Đảm bảo số lượng là số
            soLuong: Number(item.soLuong || item.quantity || 1),
            // QUAN TRỌNG: Giá ở đây phải là giá cuối cùng (đã giảm).
            // Nếu dữ liệu từ 'checkoutItems' thì 'gia' chính là 'finalPrice'.
            // Nếu dữ liệu từ 'cartItems' (fallback), ta tạm chấp nhận 'gia' hiện tại.
            gia: Number(item.gia || item.price || 0)
        }));

        setCheckoutItems(cleanCart);

        // 4. Tính tổng tiền
        const tamTinh = cleanCart.reduce((sum, item) => {
            return sum + (item.gia * item.soLuong);
        }, 0);
        
        setSummary({ tamTinh, tongCong: tamTinh + SHIP_FEE });
    };

    loadCartData();

    // Lấy địa chỉ đã lưu
    const fetchAddress = async () => {
        try {
            const userId = user.id || user.maNguoiDung;
            const res = await axiosClient.get(`/DiaChi/user/${userId}`);
            const addressData = Array.isArray(res) ? res : [];
            setSavedAddresses(addressData);
            
            // Tự động điền địa chỉ mặc định
            const defaultAddr = addressData.find(d => d.macDinh);
            if (defaultAddr) fillFormData(defaultAddr);
            else if (user.diaChi) {
                // Nếu không có sổ địa chỉ, lấy địa chỉ từ profile user
                setFormData(prev => ({ ...prev, diaChiGiaoHang: user.diaChi }));
            }
        } catch (err) {
            console.error("Lỗi lấy địa chỉ:", err);
        }
    };
    fetchAddress();

  }, [user, navigate]);

  const fillFormData = (addr) => {
    setFormData(prev => ({ 
        ...prev, 
        nguoiNhan: addr.hoTenNguoiNhan, 
        soDienThoai: addr.soDienThoai, 
        diaChiGiaoHang: addr.diaChi 
    }));
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // --- 3. XỬ LÝ ĐẶT HÀNG ---
  const handleOrder = async (e) => {
    e.preventDefault();
    
    // Validate
    if (!formData.diaChiGiaoHang.trim() || !formData.soDienThoai.trim()) {
      toast.warning("Vui lòng điền đầy đủ địa chỉ và số điện thoại!");
      return;
    }

    const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;
    if (!phoneRegex.test(formData.soDienThoai)) {
        toast.warning("Số điện thoại không hợp lệ!");
        return;
    }

    setIsLoading(true);

    // Payload chuẩn gửi Backend
    const payload = {
        maNguoiDung: user.id || user.maNguoiDung,
        nguoiNhan: formData.nguoiNhan,
        soDienThoai: formData.soDienThoai,
        diaChiGiaoHang: formData.diaChiGiaoHang, 
        ghiChu: formData.ghiChu,
        tongTien: summary.tongCong, 
        chiTietDonHangs: checkoutItems.map(item => ({
            // Ưu tiên maMon, fallback sang các trường khác nếu thiếu
            maMonAn: item.maMon || item.maMonAn || item.id,
            soLuong: item.soLuong,
            giaBan: item.gia // Giá đã chốt (đã giảm)
        }))
    };

    try {
        if (formData.phuongThuc === 'VNPAY') {
            // Thanh toán Online (Logic giữ nguyên)
            const fakeOrderId = new Date().getTime().toString();
            const res = await axiosClient.post('/Payment/CreatePaymentUrl', {
                orderId: fakeOrderId,
                amount: summary.tongCong,
                orderInfo: `Thanh toan don hang ${fakeOrderId}`,
                fullName: formData.nguoiNhan
            });
            if (res && res.url) {
                localStorage.setItem('pendingOrder', JSON.stringify(payload));
                window.location.href = res.url;
            }
        } else {
            // Thanh toán COD
            const res = await axiosClient.post('/DonHang/TaoDon', payload);
            
            if (res) {
                toast.success("🎉 Đặt hàng thành công!", { theme: "colored" });
                
                // 👇👇👇 QUAN TRỌNG: DỌN DẸP GIỎ HÀNG SAU KHI MUA 👇👇👇
                localStorage.removeItem('cartItems'); 
                localStorage.removeItem('checkoutItems');
                
                window.dispatchEvent(new Event('cart-cleared')); 
                window.dispatchEvent(new Event('cart-updated'));

                if (clearCart) clearCart(); 
                
                setTimeout(() => navigate('/history'), 1500); 
            }
        }
    } catch (err) {
        console.error("Lỗi đặt hàng:", err);
        toast.error("Đặt hàng thất bại! Vui lòng thử lại.");
    } finally {
        setIsLoading(false);
    }
  };

  const getButtonColor = () => formData.phuongThuc === 'VNPAY' ? '#005baa' : '#e64a19';
  const getButtonText = () => {
      if(isLoading) return 'ĐANG XỬ LÝ...';
      return formData.phuongThuc === 'VNPAY' ? 'THANH TOÁN VNPAY' : 'XÁC NHẬN ĐẶT HÀNG';
  };

  if (!user) return null;

  return (
    <div style={{ padding: '40px 20px', background: '#f5f5f5', minHeight: '100vh', fontFamily: '"Poppins", sans-serif' }}>
      <ToastContainer position="top-center" autoClose={2000} />
      
      <div className="container" style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '30px' }}>
        
        {/* CỘT TRÁI: FORM THÔNG TIN */}
        <div style={{ background: '#fff', padding: '35px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '25px', color: '#e64a19', borderBottom: '2px solid #fff5f2', paddingBottom: '10px' }}>🚚 Thông tin giao hàng</h2>
          
          {savedAddresses.length > 0 && (
            <div style={{ marginBottom: '25px', background: '#e3f2fd', padding: '15px', borderRadius: '10px', border: '1px solid #90caf9' }}>
              <label style={{ fontWeight: 'bold', color: '#1565c0', display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>📍 Chọn nhanh từ Sổ địa chỉ:</label>
              <select defaultValue="" onChange={(e) => { 
                  if (e.target.value === "") return;
                  const selected = savedAddresses.find(a => a.maDiaChi === parseInt(e.target.value)); 
                  if(selected) fillFormData(selected); 
              }} style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #64b5f6', outline: 'none', cursor: 'pointer' }}>
                <option value="">-- Chọn địa chỉ --</option>
                {savedAddresses.map(addr => (<option key={addr.maDiaChi} value={addr.maDiaChi}>{addr.hoTenNguoiNhan} - {addr.diaChi}</option>))}
              </select>
            </div>
          )}
          
          <form onSubmit={handleOrder} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div><label style={{fontWeight:'600', fontSize:'0.9rem'}}>Người nhận</label><input type="text" name="nguoiNhan" value={formData.nguoiNhan} onChange={handleChange} required style={{ width:'100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', marginTop:'5px' }} /></div>
                <div><label style={{fontWeight:'600', fontSize:'0.9rem'}}>Số điện thoại</label><input type="text" name="soDienThoai" value={formData.soDienThoai} onChange={handleChange} required style={{ width:'100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', marginTop:'5px' }} /></div>
            </div>
            <div><label style={{fontWeight:'600', fontSize:'0.9rem'}}>Địa chỉ chi tiết</label><textarea name="diaChiGiaoHang" value={formData.diaChiGiaoHang} onChange={handleChange} required rows="3" style={{ width:'100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', marginTop:'5px' }} /></div>
            <div><label style={{fontWeight:'600', fontSize:'0.9rem'}}>Ghi chú (Tùy chọn)</label><textarea name="ghiChu" value={formData.ghiChu} onChange={handleChange} rows="2" style={{ width:'100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', marginTop:'5px' }} /></div>

            <div style={{ marginTop: '10px', padding: '20px', background: '#f8f9fa', borderRadius: '10px' }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#2d3436' }}>💳 Phương thức thanh toán</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', border: formData.phuongThuc === 'COD' ? '2px solid #e64a19' : '1px solid #ddd', borderRadius: '10px', background: '#fff', cursor: 'pointer' }}>
                        <input type="radio" name="phuongThuc" value="COD" checked={formData.phuongThuc === 'COD'} onChange={handleChange} style={{ transform: 'scale(1.5)', accentColor: '#e64a19' }} />
                        <div><div style={{ fontWeight: 'bold' }}>Thanh toán khi nhận hàng (COD)</div><div style={{ fontSize: '0.85rem', color: '#636e72' }}>Trả tiền mặt cho shipper</div></div>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', border: formData.phuongThuc === 'VNPAY' ? '2px solid #005baa' : '1px solid #ddd', borderRadius: '10px', background: '#fff', cursor: 'pointer' }}>
                        <input type="radio" name="phuongThuc" value="VNPAY" checked={formData.phuongThuc === 'VNPAY'} onChange={handleChange} style={{ transform: 'scale(1.5)', accentColor: '#005baa' }} />
                        <img src="https://vinadesign.vn/uploads/images/2023/05/vnpay-logo-vinadesign-25-12-57-55.jpg" alt="VNPAY" style={{ height: '35px', objectFit: 'contain' }} />
                        <div><div style={{ fontWeight: 'bold', color: '#005baa' }}>Thanh toán qua VNPAY</div><div style={{ fontSize: '0.85rem', color: '#636e72' }}>Quét mã QR hoặc thẻ ATM</div></div>
                    </label>
                </div>
            </div>
            <button 
                type="submit" 
                disabled={isLoading}
                style={{ marginTop: '20px', padding: '18px', background: isLoading ? '#ccc' : getButtonColor(), color: '#fff', fontWeight: 'bold', border: 'none', borderRadius: '50px', cursor: isLoading ? 'not-allowed' : 'pointer', fontSize: '1.1rem', boxShadow: '0 8px 15px rgba(0,0,0,0.1)', transition: '0.3s' }}
            >
              {getButtonText()}
            </button>
          </form>
        </div>

        {/* CỘT PHẢI: HÓA ĐƠN */}
        <div style={{ background: '#fff', padding: '30px', borderRadius: '15px', height: 'fit-content', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', position: 'sticky', top: '80px' }}>
          <h3 style={{ fontSize: '1.3rem', marginBottom: '20px', color: '#2d3436' }}>Hóa đơn của bạn</h3>
          
          <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '20px', paddingRight: '5px' }}>
              {checkoutItems.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px dashed #eee' }}>
                  <div style={{ display:'flex', flexDirection:'column' }}>
                    <span style={{ fontWeight: '500' }}>{item.tenMon}</span>
                    <small style={{ color: '#888' }}>x {item.soLuong}</small>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <b style={{ color: '#2d3436' }}>{(item.gia * item.soLuong).toLocaleString()} đ</b>
                  </div>
                </div>
              ))}
          </div>

          <div style={{ borderTop: '2px dashed #ddd', padding: '15px 0' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'10px', color:'#636e72' }}>
                  <span>Tạm tính:</span> <span>{summary.tamTinh.toLocaleString()} đ</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', color:'#636e72' }}>
                  <span>Phí vận chuyển:</span> <span>{SHIP_FEE.toLocaleString()} đ</span>
              </div>
          </div>

          <div style={{ borderTop: '2px solid #e64a19', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', fontSize: '1.4rem', fontWeight: 'bold', color: '#e64a19' }}>
            <span>TỔNG CỘNG:</span> <span>{summary.tongCong.toLocaleString()} đ</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#95a5a6', marginTop: '20px', fontStyle: 'italic', textAlign: 'center' }}>* Vui lòng kiểm tra kỹ thông tin trước khi đặt</p>
        </div>

      </div>
    </div>
  );
}

export default Checkout;