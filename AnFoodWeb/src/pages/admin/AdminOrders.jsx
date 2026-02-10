import React, { useEffect, useState, useMemo } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import { 
  FaClipboardList, FaSearch, FaPrint, FaCheck, FaTruck, FaTimes, FaEye, FaPhone, FaMapMarkerAlt
} from 'react-icons/fa';
import 'react-toastify/dist/ReactToastify.css';
import axiosAdmin from '../../api/axiosAdmin';

// =======================================================================
// ⚖️ CẤU HÌNH HỆ THỐNG
// =======================================================================
const API_BASE_URL = 'http://localhost:5010'; 

// Hàm format tiền tệ
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
};

function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null); 

  // --- 1. TẢI DANH SÁCH ĐƠN HÀNG ---
  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await axiosAdmin.get('/DonHang');
      let data = [];
      if (Array.isArray(response)) data = response;
      else if (response?.data) data = response.data;
      else if (response?.result) data = response.result;

      // Sắp xếp đơn mới nhất lên đầu
      const sorted = data.sort((a, b) => b.maDonHang - a.maDonHang);
      setOrders(sorted);
    } catch (err) {
      console.error("Lỗi tải đơn:", err);
      if (err.response?.status !== 403) toast.error("❌ Không thể tải danh sách đơn hàng.");
    } finally {
      setLoading(false);
    }
  };

  // --- 2. XỬ LÝ IN HÓA ĐƠN ---
  const handlePrintOrder = (order) => {
    if (!order) return;

    // 👇 CHUẨN HÓA DỮ LIỆU TRƯỚC KHI IN 👇
    // Lấy đúng trường dữ liệu (ưu tiên trường mới, fallback về trường cũ)
    const customerName = order.nguoiNhan || order.NguoiNhan || order.tenNguoiNhan || order.nguoiDung?.hoTen || "Khách vãng lai";
    const customerPhone = order.soDienThoai || order.SoDienThoai || order.sdt || order.nguoiDung?.soDienThoai || "---";
    const customerAddress = order.diaChiGiaoHang || order.DiaChiGiaoHang || order.diaChi || "Tại quán";
    const orderNote = order.ghiChu || order.GhiChu || "";
    const dateStr = new Date(order.ngayDat).toLocaleString('vi-VN');
    
    // Tạo HTML danh sách món
    const itemsHtml = (order.chiTietDonHangs || order.chiTiet || []).map(item => {
        let imgSrc = item.monAn?.hinhAnh || item.hinhAnh || '';
        // Xử lý ảnh
        if (imgSrc && !imgSrc.startsWith('http')) {
            imgSrc = `${API_BASE_URL}${imgSrc}`; 
        }
        
        const imgTag = imgSrc 
            ? `<img src="${imgSrc}" class="product-img" />` 
            : '<span style="color:#ccc; font-size:10px;">No Image</span>';

        return `
            <tr>
                <td style="text-align: left;">
                    <div style="font-weight:bold;">${item.monAn?.tenMon || item.tenMon}</div>
                </td>
                <td style="text-align: center;">${imgTag}</td>
                <td style="text-align: center;">${item.soLuong}</td>
                <td style="text-align: right;">${Number(item.donGia).toLocaleString()}</td>
                <td style="text-align: right; font-weight:bold;">${Number(item.soLuong * item.donGia).toLocaleString()}</td>
            </tr>
        `;
    }).join('');

    // Mở cửa sổ in
    const printWindow = window.open('', '', 'height=800,width=600');
    
    printWindow.document.write(`
        <html>
            <head>
                <title>Hóa Đơn #${order.maDonHang}</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #333; line-height: 1.4; }
                    .container { max-width: 100%; margin: 0 auto; }
                    .header { text-align: center; margin-bottom: 20px; border-bottom: 2px dashed #444; padding-bottom: 15px; }
                    .brand-name { font-size: 26px; font-weight: 900; text-transform: uppercase; margin: 0; color: #e64a19; }
                    .invoice-title { font-size: 20px; font-weight: bold; margin-top: 15px; text-transform: uppercase; }
                    .info-section { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 13px; }
                    .info-col { width: 48%; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
                    th { border-bottom: 2px solid #000; padding: 8px 5px; text-align: left; background: #f8f9fa; }
                    td { border-bottom: 1px solid #eee; padding: 8px 5px; vertical-align: middle; }
                    .product-img { width: 40px; height: 40px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd; }
                    .total-section { text-align: right; font-size: 16px; font-weight: bold; border-top: 2px solid #000; padding-top: 15px; }
                    .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #666; font-style: italic; }
                    @media print {
                        @page { margin: 0.5cm; }
                        body { -webkit-print-color-adjust: exact; }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="brand-name">FASTBITE FOOD</div>
                        <div>123 Đường 3/2, Ninh Kiều, Cần Thơ</div>
                        <div>Hotline: 0393 399 770</div>
                        
                        <div class="invoice-title">HÓA ĐƠN THANH TOÁN</div>
                        <div>Mã đơn: <strong>#${order.maDonHang}</strong></div>
                        <div>Ngày: ${dateStr}</div>
                    </div>

                    <div class="info-section">
                        <div class="info-col">
                            <strong>KHÁCH HÀNG:</strong><br/>
                            ${customerName}<br/>
                            ${customerPhone}
                        </div>
                        <div class="info-col" style="text-align:right;">
                            <strong>GIAO TỚI:</strong><br/>
                            ${customerAddress}<br/>
                            ${orderNote ? `<span style="font-style:italic; color:red;">Note: ${orderNote}</span>` : ""}
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th style="width: 40%">Món ăn</th>
                                <th style="text-align: center;">Ảnh</th>
                                <th style="text-align: center;">SL</th>
                                <th style="text-align: right;">Đơn giá</th>
                                <th style="text-align: right;">T.Tiền</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                    </table>

                    <div class="total-section">
                        TỔNG CỘNG: ${formatCurrency(order.tongTien)}
                    </div>

                    <div class="footer">
                        <p>Cảm ơn quý khách đã lựa chọn FastBite!<br/>Chúc quý khách ngon miệng.</p>
                    </div>
                </div>
            </body>
        </html>
    `);

    printWindow.document.close();
    
    setTimeout(() => {
        if(printWindow) {
            printWindow.focus();
            printWindow.print();
        }
    }, 800);
  };

  // --- HÀM CHUẨN HÓA TRẠNG THÁI ---
  const normalizeStatus = (status) => {
      if (!status) return '';
      let s = status.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");
      if (['choduyet', 'cho_duyet', 'cho_xu_ly'].includes(s)) return 'cho_xu_ly'; 
      if (['danggiao', 'dang_giao'].includes(s)) return 'dang_giao';
      if (['hoanthanh', 'hoan_thanh', 'success'].includes(s)) return 'hoan_thanh';
      if (['dahuy', 'huy'].includes(s)) return 'huy';
      return s;
  };

  // --- CẬP NHẬT TRẠNG THÁI ---
  const handleStatusChange = async (maDonHang, newStatus) => {
    if (newStatus === 'huy' && !window.confirm("⚠️ Bạn chắc chắn muốn HỦY đơn hàng này?")) return;

    try {
      await axiosAdmin.put(
        `/DonHang/CapNhatTrangThai/${maDonHang}`, 
        JSON.stringify(newStatus),
        { headers: { 'Content-Type': 'application/json' } }
      );

      toast.success(`✅ Đã cập nhật đơn #${maDonHang}`);
      
      setOrders(prev => prev.map(o => o.maDonHang === maDonHang ? { ...o, trangThai: newStatus } : o));
      
      if (selectedOrder?.maDonHang === maDonHang) {
          setSelectedOrder(prev => ({ ...prev, trangThai: newStatus }));
      }
      
      fetchOrders(); 

    } catch (err) {
      console.error(err);
      toast.error("❌ " + (err.response?.data?.message || "Lỗi cập nhật trạng thái"));
    }
  };

  // --- LỌC DỮ LIỆU ---
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const normalizedStatus = normalizeStatus(order.trangThai);
      if (activeTab !== 'all' && activeTab !== normalizedStatus) return false;

      const search = searchTerm.toLowerCase();
      // 👇 TÌM KIẾM THÔNG MINH HƠN (Check cả trường cũ và mới)
      const orderId = String(order.maDonHang);
      const customerName = (order.nguoiNhan || order.tenNguoiNhan || order.nguoiDung?.hoTen || "").toLowerCase();
      const phone = (order.soDienThoai || order.sdt || order.nguoiDung?.soDienThoai || "");

      return orderId.includes(search) || customerName.includes(search) || phone.includes(search);
    });
  }, [orders, activeTab, searchTerm]);

  // --- UI HELPERS ---
  const getStatusBadge = (status) => {
    const s = normalizeStatus(status);
    const config = {
      'cho_xu_ly':  { color: '#856404', bg: '#fff3cd', label: '⏳ Chờ Duyệt' },
      'dang_giao':  { color: '#0c5460', bg: '#d1ecf1', label: '🚚 Đang Giao' },
      'hoan_thanh': { color: '#155724', bg: '#d4edda', label: '✅ Hoàn Thành' },
      'huy':        { color: '#721c24', bg: '#f8d7da', label: '❌ Đã Hủy' }
    };
    const style = config[s] || { color: '#333', bg: '#eee', label: status };
    return <span style={{ backgroundColor: style.bg, color: style.color, padding: '5px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>{style.label}</span>;
  };

  return (
    <div style={{ padding: '30px', background: '#f8f9fa', minHeight: '100vh', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
      <ToastContainer position="top-right" autoClose={2000} theme="colored" />
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#2d3436', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <FaClipboardList color="#e64a19" /> Quản Lý Đơn Hàng
        </h2>
        
        <div style={{ position: 'relative', width: '300px' }}>
            <FaSearch style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#b2bec3' }} />
            <input 
                type="text" placeholder="Tìm mã đơn, tên khách..." 
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '10px 15px 10px 40px', borderRadius: '30px', border: '1px solid #dfe6e9', outline: 'none' }}
            />
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '15px' }}>
        {[
            { id: 'all', label: 'Tất cả' },
            { id: 'cho_xu_ly', label: 'Chờ duyệt' },
            { id: 'dang_giao', label: 'Đang giao' },
            { id: 'hoan_thanh', label: 'Hoàn thành' },
            { id: 'huy', label: 'Đã hủy' }
        ].map(tab => (
            <button 
                key={tab.id} onClick={() => setActiveTab(tab.id)}
                style={{ 
                    padding: '8px 20px', borderRadius: '30px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem',
                    background: activeTab === tab.id ? '#2d3436' : '#fff',
                    color: activeTab === tab.id ? '#fff' : '#636e72',
                    boxShadow: activeTab === tab.id ? '0 4px 10px rgba(0,0,0,0.2)' : '0 2px 5px rgba(0,0,0,0.05)',
                    transition: '0.3s'
                }}
            >
                {tab.label}
            </button>
        ))}
      </div>

      {/* ORDERS TABLE */}
      <div style={{ background: '#fff', borderRadius: '15px', boxShadow: '0 5px 20px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        {loading ? <div style={{padding:'50px', textAlign:'center', color:'#999'}}>Đang tải dữ liệu...</div> : (
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1000px' }}>
                <thead>
                    <tr style={{ background: '#f8f9fa', color: '#636e72', textAlign: 'left', fontSize: '0.9rem', borderBottom: '2px solid #eee' }}>
                        <th style={{ padding: '20px' }}>Mã Đơn</th>
                        <th style={{ padding: '20px' }}>Khách hàng</th>
                        <th style={{ padding: '20px' }}>Tổng tiền</th>
                        <th style={{ padding: '20px', textAlign: 'center' }}>Trạng thái</th>
                        <th style={{ padding: '20px', textAlign: 'center' }}>Thao tác</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredOrders.length > 0 ? filteredOrders.map(order => {
                        const status = normalizeStatus(order.trangThai);
                        // 👇 LẤY DỮ LIỆU HIỂN THỊ THÔNG MINH 👇
                        const dName = order.nguoiNhan || order.tenNguoiNhan || order.nguoiDung?.hoTen || "Khách vãng lai";
                        const dPhone = order.soDienThoai || order.sdt || order.nguoiDung?.soDienThoai || "";
                        const dAddress = order.diaChiGiaoHang || order.diaChi || "Tại quán";

                        return (
                        <tr key={order.maDonHang} style={{ borderBottom: '1px solid #f1f2f6', transition: '0.2s' }} className="hover-row">
                            <td style={{ padding: '20px' }}>
                                <div style={{ fontWeight: 'bold', color: '#2d3436' }}>#{order.maDonHang}</div>
                                <div style={{ fontSize: '0.8rem', color: '#95a5a6' }}>{new Date(order.ngayDat).toLocaleDateString('vi-VN')}</div>
                            </td>
                            <td style={{ padding: '20px' }}>
                                <div style={{ fontWeight: '600', color: '#2d3436' }}>
                                    {dName}
                                </div>
                                <div style={{ fontSize: '0.85rem', color: '#636e72', display:'flex', alignItems:'center', gap:'5px' }}>
                                    <FaPhone size={10}/> {dPhone}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#95a5a6', marginTop:'3px', display:'flex', alignItems:'center', gap:'5px' }}>
                                    <FaMapMarkerAlt size={10} /> {dAddress}
                                </div>
                            </td>
                            <td style={{ padding: '20px', fontWeight: 'bold', color: '#e64a19', fontSize: '1.1rem' }}>
                                {formatCurrency(order.tongTien)}
                            </td>
                            <td style={{ padding: '20px', textAlign: 'center' }}>
                                {getStatusBadge(order.trangThai)}
                            </td>
                            <td style={{ padding: '20px', textAlign: 'center' }}>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                    <button onClick={() => setSelectedOrder(order)} style={actionBtnStyle('#e3f2fd', '#0984e3')} title="Xem chi tiết">
                                        <FaEye />
                                    </button>
                                    
                                    {status === 'cho_xu_ly' && (
                                        <>
                                            <button onClick={() => handleStatusChange(order.maDonHang, 'dang_giao')} style={actionBtnStyle('#e8f5e9', '#27ae60')} title="Duyệt đơn">
                                                <FaCheck />
                                            </button>
                                            <button onClick={() => handleStatusChange(order.maDonHang, 'huy')} style={actionBtnStyle('#ffebee', '#c0392b')} title="Hủy đơn">
                                                <FaTimes />
                                            </button>
                                        </>
                                    )}
                                    
                                    {status === 'dang_giao' && (
                                        <button onClick={() => handleStatusChange(order.maDonHang, 'hoan_thanh')} style={actionBtnStyle('#e8f5e9', '#27ae60')} title="Xác nhận hoàn thành">
                                            <FaTruck />
                                        </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    )}) : (
                        <tr><td colSpan="5" style={{ padding: '50px', textAlign: 'center', color: '#95a5a6' }}>Không tìm thấy đơn hàng nào.</td></tr>
                    )}
                </tbody>
                </table>
            </div>
        )}
      </div>

      {/* MODAL CHI TIẾT ĐƠN HÀNG */}
      {selectedOrder && (
          <div style={modalOverlayStyle}>
              <div style={modalContentStyle} className="fade-in">
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid #eee', paddingBottom:'15px', marginBottom:'20px'}}>
                      <h3 style={{margin:0, color:'#2d3436'}}>Chi Tiết Đơn Hàng #{selectedOrder.maDonHang}</h3>
                      <button onClick={() => setSelectedOrder(null)} style={{border:'none', background:'none', fontSize:'1.2rem', cursor:'pointer'}}><FaTimes/></button>
                  </div>
                  
                  {/* 👇 LẤY DỮ LIỆU CHO MODAL 👇 */}
                  {(() => {
                      const mName = selectedOrder.nguoiNhan || selectedOrder.tenNguoiNhan || selectedOrder.nguoiDung?.hoTen || "Khách vãng lai";
                      const mPhone = selectedOrder.soDienThoai || selectedOrder.sdt || selectedOrder.nguoiDung?.soDienThoai || "";
                      const mAddress = selectedOrder.diaChiGiaoHang || selectedOrder.diaChi || "Tại quán";
                      const mNote = selectedOrder.ghiChu || selectedOrder.GhiChu;

                      return (
                        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', marginBottom:'20px'}}>
                            <div>
                                <h4 style={{margin:'0 0 10px', color:'#636e72', fontSize:'0.9rem', textTransform:'uppercase'}}>Khách hàng</h4>
                                <div style={{fontWeight:'bold'}}>{mName}</div>
                                <div>{mPhone}</div>
                                <div style={{fontSize:'0.9rem', color:'#636e72', marginTop:'5px'}}>{mAddress}</div>
                            </div>
                            <div>
                                <h4 style={{margin:'0 0 10px', color:'#636e72', fontSize:'0.9rem', textTransform:'uppercase'}}>Thông tin đơn</h4>
                                <div>Ngày đặt: {new Date(selectedOrder.ngayDat).toLocaleString('vi-VN')}</div>
                                <div style={{marginTop:'5px'}}>Trạng thái: {getStatusBadge(selectedOrder.trangThai)}</div>
                                {mNote && <div style={{color:'#d63031', fontStyle:'italic', marginTop:'5px', background:'#fff0f0', padding:'5px', borderRadius:'5px'}}>Note: {mNote}</div>}
                            </div>
                        </div>
                      );
                  })()}

                  <div style={{background:'#f8f9fa', padding:'15px', borderRadius:'10px', marginBottom:'20px', maxHeight:'300px', overflowY:'auto', border:'1px solid #eee'}}>
                      <h4 style={{margin:'0 0 10px', color:'#2d3436'}}>Danh sách món ăn</h4>
                      {(selectedOrder.chiTietDonHangs || selectedOrder.chiTiet || []).map((item, idx) => (
                          <div key={idx} style={{display:'flex', justifyContent:'space-between', marginBottom:'10px', borderBottom:'1px dashed #e0e0e0', paddingBottom:'8px'}}>
                              <div style={{display:'flex', gap:'12px', alignItems:'center'}}>
                                  <div style={{width:'35px', height:'35px', background:'#fff', border:'1px solid #ddd', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.9rem', fontWeight:'bold', color:'#e64a19'}}>
                                    {item.soLuong}x
                                  </div>
                                  <div>
                                      <div style={{fontWeight:'600', fontSize:'0.95rem'}}>{item.monAn?.tenMon || item.tenMon || "Món không tên"}</div>
                                      <div style={{fontSize:'0.8rem', color:'#999'}}>{formatCurrency(item.donGia)} / món</div>
                                  </div>
                              </div>
                              <span style={{fontWeight:'bold', alignSelf:'center'}}>{formatCurrency(item.soLuong * item.donGia)}</span>
                          </div>
                      ))}
                      <div style={{display:'flex', justifyContent:'space-between', marginTop:'15px', paddingTop:'15px', borderTop:'2px solid #ddd', fontSize:'1.2rem', fontWeight:'bold', color:'#e64a19'}}>
                          <span>TỔNG CỘNG</span>
                          <span>{formatCurrency(selectedOrder.tongTien)}</span>
                      </div>
                  </div>

                  <div style={{textAlign:'right', display:'flex', justifyContent:'flex-end', gap:'10px'}}>
                      <button 
                        onClick={() => handlePrintOrder(selectedOrder)} 
                        style={{padding:'10px 25px', border:'1px solid #dfe6e9', background:'#fff', color:'#2d3436', borderRadius:'8px', cursor:'pointer', display:'flex', alignItems:'center', gap:'8px', fontWeight:'600', boxShadow:'0 2px 5px rgba(0,0,0,0.05)'}}
                      >
                        <FaPrint/> In hóa đơn
                      </button>
                      <button 
                        onClick={() => setSelectedOrder(null)} 
                        style={{padding:'10px 25px', background:'#2d3436', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontWeight:'600', boxShadow:'0 2px 5px rgba(0,0,0,0.2)'}}
                      >
                        Đóng
                      </button>
                  </div>
              </div>
          </div>
      )}

      <style>{`
        .hover-row:hover { background-color: #fffcf5 !important; }
        .fade-in { animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>
    </div>
  );
}

// STYLES 
const actionBtnStyle = (bg, color) => ({ 
    width: '38px', height: '38px', borderRadius: '10px', 
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', 
    background: bg, color: color, border: 'none', cursor: 'pointer', 
    transition: '0.2s', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' 
});

const modalOverlayStyle = { 
    position:'fixed', top:0, left:0, right:0, bottom:0, 
    background:'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)',
    display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 
};

const modalContentStyle = { 
    background:'#fff', width:'650px', borderRadius:'16px', padding:'30px', 
    boxShadow:'0 20px 50px rgba(0,0,0,0.15)', maxHeight:'90vh', overflowY:'auto' 
};

export default AdminOrders;