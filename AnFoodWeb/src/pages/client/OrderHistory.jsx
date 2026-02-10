import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaBoxOpen, FaClock, FaMapMarkerAlt, FaShoppingBag } from 'react-icons/fa';

// ✅ IMPORT CHUẨN TỪ HỆ THỐNG
import axiosClient from '../../api/axiosClient';
import { getImageUrl } from '../../utils/imageHelper';

function OrderHistory({ user }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- 1. FETCH DỮ LIỆU ---
  useEffect(() => {
    const fetchOrders = async () => {
      if (!user || !user.id) {
        setOrders([]);
        return;
      }

      setLoading(true);
      try {
        // Dùng axiosClient chuẩn
        // Backend trả về danh sách có trường 'diaChiGiaoHang' (khớp chữ hoa/thường tùy axios config)
        const res = await axiosClient.get(`/DonHang/LichSu/${user.id}`);
        // Firewall: Đảm bảo dữ liệu luôn là mảng
        setOrders(Array.isArray(res) ? res : []);
      } catch (err) {
        console.error("Lỗi tải lịch sử:", err);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user]);

  // --- 2. HELPER: BADGE TRẠNG THÁI ---
  const getStatusBadge = (status) => {
    const statusMap = {
      'ChoDuyet': { color: '#e67e22', bg: '#fff3e0', label: '⏳ Chờ Duyệt', border: '#ffe0b2' },
      'cho_xu_ly': { color: '#e67e22', bg: '#fff3e0', label: '⏳ Chờ Duyệt', border: '#ffe0b2' }, // Map thêm key chuẩn backend
      'dang_giao': { color: '#16a085', bg: '#e0f2f1', label: '🚚 Đang Giao', border: '#b2dfdb' },
      'hoan_thanh': { color: '#27ae60', bg: '#e8f5e9', label: '✅ Hoàn Thành', border: '#c8e6c9' },
      'huy': { color: '#c0392b', bg: '#ffebee', label: '❌ Đã Hủy', border: '#ffcdd2' }
    };
    
    // Chuẩn hóa key (lowercase) để match tốt hơn
    const normalizedStatus = statusMap[status] || statusMap[status?.toLowerCase()] || { 
        color: '#7f8c8d', bg: '#f5f6fa', label: status || 'Không rõ', border: '#dcdde1' 
    };

    return (
      <span style={{ 
          padding: '6px 14px', borderRadius: '30px', fontSize: '0.85rem', fontWeight: 'bold', 
          color: normalizedStatus.color, backgroundColor: normalizedStatus.bg, border: `1px solid ${normalizedStatus.border}`,
          display: 'inline-flex', alignItems: 'center', gap: '5px'
      }}>
        {normalizedStatus.label}
      </span>
    );
  };

  // --- 3. RENDER ---
  if (!user) return (
    <div style={{ padding: '80px 20px', textAlign: 'center', minHeight:'60vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
        <FaBoxOpen size={50} color="#ccc" style={{marginBottom:'20px'}}/>
        <h3 style={{color:'#636e72'}}>Bạn chưa đăng nhập</h3>
        <Link to="/login" style={{ marginTop:'20px', padding:'10px 25px', background:'#e64a19', color:'#fff', borderRadius:'30px', textDecoration:'none', fontWeight:'bold' }}>Đăng nhập ngay</Link>
    </div>
  );

  if (loading) return <div style={{ padding: '100px', textAlign: 'center', color:'#666' }}>Đang tải lịch sử đơn hàng...</div>;

  return (
    <div style={{ padding: '50px 20px', background: '#f8f9fa', minHeight: '100vh', fontFamily: '"Poppins", sans-serif' }}>
      <div className="container" style={{ maxWidth: '900px', margin: '0 auto' }}>
        
        {/* Header Trang */}
        <div style={{ marginBottom: '40px', textAlign: 'center' }}>
            <h2 style={{ fontSize: '2.2rem', fontWeight: '800', color: '#2d3436', marginBottom:'10px' }}>Lịch Sử Đơn Hàng</h2>
            <p style={{ color: '#636e72' }}>Theo dõi trạng thái các đơn hàng của bạn</p>
        </div>
        
        {orders.length === 0 ? (
          <div style={{ background: '#fff', padding: '60px', borderRadius: '20px', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
            <img src="https://cdni.iconscout.com/illustration/premium/thumb/empty-box-4085812-3385481.png" alt="Empty" style={{ width: '150px', marginBottom: '25px', opacity: 0.8 }} />
            <h3 style={{ fontSize: '1.2rem', color: '#2d3436', marginBottom: '10px' }}>Chưa có đơn hàng nào</h3>
            <p style={{ color: '#636e72', marginBottom: '30px' }}>Hãy order món ngon ngay hôm nay!</p>
            <Link to="/menu" style={{ display: 'inline-block', padding: '12px 35px', background: '#e64a19', color: '#fff', borderRadius: '50px', textDecoration: 'none', fontWeight: 'bold', boxShadow: '0 5px 15px rgba(230, 74, 25, 0.3)' }}>
                Khám phá Menu <FaShoppingBag style={{marginLeft:'5px'}}/>
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            {orders.map(order => {
              if (!order || !order.maDonHang) return null;
              // Backend trả về 'ChiTiet' (chữ hoa chữ thường tùy json serializer, check cả 2 cho chắc)
              const chiTietItems = Array.isArray(order.chiTiet) ? order.chiTiet : (Array.isArray(order.ChiTiet) ? order.ChiTiet : []);
              
              return (
              <div key={order.maDonHang} style={{ background: '#fff', borderRadius: '20px', boxShadow: '0 5px 20px rgba(0,0,0,0.03)', overflow: 'hidden', border: '1px solid #eee', transition:'transform 0.2s' }}>
                
                {/* Header Card */}
                <div style={{ padding: '20px 25px', background: '#fff', borderBottom: '1px dashed #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap:'wrap', gap:'15px' }}>
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <div style={{ background:'#e64a19', color:'#fff', padding:'8px 12px', borderRadius:'10px', fontWeight:'bold', fontSize:'0.9rem' }}>
                        #{order.maDonHang}
                    </div>
                    <span style={{ color: '#636e72', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FaClock color="#b2bec3" /> {order.ngayDat ? new Date(order.ngayDat).toLocaleString('vi-VN') : 'N/A'}
                    </span>
                  </div>
                  <div>{getStatusBadge(order.trangThai)}</div>
                </div>

                {/* Body Card - Danh sách món */}
                <div style={{ padding: '25px' }}>
                  {chiTietItems.length > 0 ? chiTietItems.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px', borderBottom: idx !== chiTietItems.length - 1 ? '1px solid #f8f9fa' : 'none', paddingBottom: idx !== chiTietItems.length - 1 ? '20px' : '0' }}>
                      {/* ✅ DÙNG HÀM ẢNH CHUẨN */}
                      <img 
                        src={getImageUrl(item.hinhAnh || item.HinhAnh)} 
                        alt={item.tenMon || 'Món ăn'} 
                        style={{ width: '80px', height: '80px', borderRadius: '15px', objectFit: 'cover', border: '1px solid #f1f2f6' }} 
                        onError={(e) => e.target.src = 'https://placehold.co/100x100?text=Food'}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '700', fontSize: '1.1rem', color: '#2d3436', marginBottom: '5px' }}>{item.tenMon || item.TenMon || 'Unknown Item'}</div>
                        <div style={{ fontSize: '0.9rem', color: '#636e72' }}>Số lượng: <b style={{color: '#2d3436'}}>{item.soLuong || item.SoLuong || 0}</b></div>
                      </div>
                      <div style={{ fontWeight: '700', color: '#e64a19', fontSize: '1.1rem' }}>
                        {((item.donGia || item.DonGia || 0) * (item.soLuong || item.SoLuong || 0)).toLocaleString()} đ
                      </div>
                    </div>
                  )) : <div style={{ textAlign: 'center', color: '#b2bec3', fontStyle:'italic' }}>Không có chi tiết món ăn</div>}
                </div>

                {/* Footer Card - Tổng tiền & Địa chỉ */}
                <div style={{ padding: '20px 25px', background: '#fdfdfd', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap:'wrap', gap:'15px' }}>
                  <div style={{ fontSize: '0.9rem', color: '#636e72', maxWidth: '60%', display: 'flex', gap: '10px', alignItems:'center' }}>
                    <FaMapMarkerAlt style={{ color: '#e64a19', flexShrink: 0 }} /> 
                    {/* 👇 CHỈNH SỬA QUAN TRỌNG: Ưu tiên lấy diaChiGiaoHang, sau đó mới tới diaChi */}
                    <span style={{ lineHeight: '1.4' }}>{order.diaChiGiaoHang || order.diaChi || 'Chưa cập nhật địa chỉ'}</span>
                  </div>
                  <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#2d3436', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{fontSize:'0.9rem', fontWeight:'normal', color:'#999'}}>Tổng cộng:</span>
                    <span style={{color:'#e64a19'}}>{(order.tongTien || 0).toLocaleString()} đ</span>
                  </div>
                </div>

              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default OrderHistory;