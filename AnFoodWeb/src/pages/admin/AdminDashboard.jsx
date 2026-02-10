import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { 
  FaDollarSign, FaShoppingCart, FaUserFriends, 
  FaChartLine, FaFileExport, FaSyncAlt
} from 'react-icons/fa';
import { 
  PieChart, Pie, Cell, Legend, Tooltip as RechartsTooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, ComposedChart, Line
} from 'recharts';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import axiosAdmin from '../../api/axiosAdmin';

// Bảng màu tươi sáng cho biểu đồ danh mục
const PIE_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF4560', '#2F3640'];

function AdminDashboard() {
  const [data, setData] = useState({
    doanhThu: 0, 
    donHang: 0, 
    monAn: 0, 
    tongKhach: 0, 
    aov: 0,
    statusData: [], 
    topSanPham: [], 
    donMoi: [], 
    revenueChart: [], 
    lowStock: []
  });
  
  const [loading, setLoading] = useState(true);
  const [timeSpan, setTimeSpan] = useState('week');
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);

  // --- HÀM TẢI DỮ LIỆU ---
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axiosAdmin.get(`/ThongKe/Dashboard?timeSpan=${timeSpan}&date=${customDate}`);
      
      console.log("🔥 DASHBOARD DATA:", res); 

      if (!res) throw new Error("Không nhận được dữ liệu");

      // Xử lý dữ liệu biểu đồ tròn (Danh mục)
      // Dữ liệu trả về dạng: [{name: 'Burger', value: 10}, {name: 'Pizza', value: 5}]
      const rawStatus = res.statusData || [];
      const formattedPie = rawStatus.map((item, index) => ({
          name: item.name,
          value: item.value,
          color: PIE_COLORS[index % PIE_COLORS.length] // Gán màu xoay vòng
      }));

      setData({
          doanhThu: Number(res.doanhThu) || 0,
          donHang: Number(res.donHang) || 0,
          tongKhach: Number(res.tongKhach) || 0,
          aov: Number(res.aov) || 0,
          statusData: formattedPie,
          revenueChart: Array.isArray(res.revenueChart) ? res.revenueChart : [],
          topSanPham: Array.isArray(res.topSanPham) ? res.topSanPham : [],
          donMoi: Array.isArray(res.donMoi) ? res.donMoi : [],
          lowStock: Array.isArray(res.lowStock) ? res.lowStock : []
      });

    } catch (err) {
      console.error("🔥 Lỗi tải Dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeSpan, customDate]);

  // --- XUẤT EXCEL ---
  const handleExport = async () => {
    try {
        const resInventory = await axiosAdmin.get('/MonAn');
        const inventoryData = Array.isArray(resInventory) ? resInventory : (resInventory.data || []);
        
        const wb = XLSX.utils.book_new();
        const createSheet = (header, body, name) => {
            const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
            XLSX.utils.book_append_sheet(wb, ws, name);
        };

        createSheet(
            ["Ngày", "Doanh Thu", "Số Đơn"], 
            (data.revenueChart || []).map(i => [i.date || i.Date, i.doanhThu || i.DoanhThu, i.soDon || i.SoDon || 0]), 
            "Doanh Thu"
        );

        createSheet(
            ["Danh Mục", "Số Lượng Bán"], 
            (data.statusData || []).map(i => [i.name, i.value]), 
            "Tỷ Lệ Danh Mục"
        );

        const fileName = `BaoCao_FastBite_${new Date().toISOString().slice(0,10)}.xlsx`;
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const dataBlob = new Blob([excelBuffer], { type: 'application/octet-stream' });
        saveAs(dataBlob, fileName);
        
        toast.success("Xuất báo cáo thành công!");
    } catch (err) {
        console.error(err);
        toast.error("Lỗi khi xuất file Excel");
    }
  };

  // Helper Badge
  const getStatusBadge = (status) => {
     if(!status) return <span style={{color:'#ccc'}}>N/A</span>;
     const sKey = status.toLowerCase();
     const map = {
         'choduyet': { label: '⏳ Chờ duyệt', bg: '#fff3cd', color: '#856404' },
         'dang_giao': { label: '🚀 Đang giao', bg: '#d1ecf1', color: '#0c5460' },
         'hoan_thanh': { label: '✅ Hoàn thành', bg: '#d4edda', color: '#155724' },
         'success': { label: '✅ Hoàn thành', bg: '#d4edda', color: '#155724' },
         'huy': { label: '🗑️ Đã hủy', bg: '#f8d7da', color: '#721c24' },
         'dahuy': { label: '🗑️ Đã hủy', bg: '#f8d7da', color: '#721c24' },
         'tuchoi': { label: '⛔ Từ chối', bg: '#e2e3e5', color: '#383d41' }
     };
     
     const conf = Object.keys(map).find(k => sKey.includes(k)) || null;
     const style = conf ? map[conf] : { label: status, bg: '#f5f6fa', color: '#636e72' };

     return (
        <span style={{ backgroundColor: style.bg, color: style.color, padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
            {style.label}
        </span>
     );
  };

  return (
    <div style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', padding: '30px', background: '#f8f9fa', minHeight: '100vh' }}>
      <ToastContainer autoClose={2000} />
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '20px' }}>
        <h2 style={{ color: '#2d3436', fontWeight: '800', fontSize: '1.8rem', margin: 0 }}>
            Dashboard FastBite
        </h2>
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: '#fff', padding: '8px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.03)' }}>
            {timeSpan === 'custom' && (
                <input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} style={controlStyle} />
            )}
            <select value={timeSpan} onChange={(e) => setTimeSpan(e.target.value)} style={controlStyle}>
                <option value="today">Hôm nay</option>
                <option value="week">7 ngày qua</option>
                <option value="month">Tháng này</option>
                <option value="custom">Chọn ngày...</option>
                <option value="all">Toàn bộ</option>
            </select>
            
            <button onClick={fetchData} style={iconBtnStyle} title="Làm mới"> 
                <FaSyncAlt className={loading ? "fa-spin" : ""} /> 
            </button>
            <button onClick={handleExport} style={primaryBtnStyle}> 
                <FaFileExport /> Xuất Excel 
            </button>
        </div>
      </div>

      {loading && data.doanhThu === 0 ? (
          <div style={{ textAlign: 'center', padding: '100px', color: '#b2bec3' }}>
              <FaSyncAlt className="fa-spin" size={30} />
              <p style={{marginTop:'10px'}}>Đang tải dữ liệu thống kê...</p>
          </div>
      ) : (
        <>
          {/* 1. KPI CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            <KpiCard title="Doanh thu" value={data.doanhThu.toLocaleString()} unit="đ" icon={<FaDollarSign />} color="#00b894" bg="#e0f9f4" />
            <KpiCard title="Đơn hàng" value={data.donHang} icon={<FaShoppingCart />} color="#0984e3" bg="#e3f2fd" />
            <KpiCard title="Giá trị TB/Đơn" value={data.aov.toLocaleString()} unit="đ" icon={<FaChartLine />} color="#6c5ce7" bg="#ede9fe" />
            <KpiCard title="Khách hàng" value={data.tongKhach} icon={<FaUserFriends />} color="#e17055" bg="#ffece6" />
          </div>

          {/* 2. MAIN CHARTS AREA */}
          <div className="grid-charts" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '25px', marginBottom: '30px' }}>
            
            {/* Chart Doanh thu (Area Chart) */}
            <div style={cardStyle}>
                <h3 style={cardTitleStyle}>📈 Hiệu Suất Kinh Doanh (7 ngày qua)</h3>
                <div style={{ height: '350px', width: '100%' }}> 
                    {data.revenueChart && data.revenueChart.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={data.revenueChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorDoanhThu" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0984e3" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#0984e3" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey={data.revenueChart[0].Date ? "Date" : "date"} axisLine={false} tickLine={false} tick={{fill: '#636e72', fontSize: 12}} />
                                <YAxis yAxisId="left" axisLine={false} tickLine={false} tickFormatter={val => val>=1000000 ? `${(val/1000000).toFixed(1)}M` : `${val/1000}k`} />
                                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} />
                                <RechartsTooltip formatter={(val) => new Intl.NumberFormat('vi-VN').format(val) + ' đ'} />
                                
                                <Area yAxisId="left" type="monotone" dataKey={data.revenueChart[0].DoanhThu ? "DoanhThu" : "doanhThu"} name="Doanh Thu" stroke="#0984e3" fillOpacity={1} fill="url(#colorDoanhThu)" />
                                <Line yAxisId="right" type="monotone" dataKey={data.revenueChart[0].SoDon ? "SoDon" : "soDon"} name="Số Đơn" stroke="#e67e22" strokeWidth={2} dot={{r: 4}} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    ) : (
                        <div style={emptyStateStyle}>Chưa có dữ liệu biểu đồ</div>
                    )}
                </div>
            </div>

            {/* Chart Danh Mục (Pie Chart) - ĐÃ NÂNG CẤP HIỂN THỊ % */}
            <div style={cardStyle}>
                <h3 style={cardTitleStyle}>🍕 Tỷ Lệ Danh Mục Bán Chạy</h3>
                <div style={{ height: '350px', width: '100%' }}> 
                    {data.statusData && data.statusData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={data.statusData} 
                                    innerRadius={0} 
                                    outerRadius={100} // Tăng bán kính để label dễ nhìn hơn
                                    paddingAngle={0} 
                                    dataKey="value"
                                    nameKey="name" 
                                    label={({ name, percent, value }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`} // ✅ Hiển thị: Tên: SL ( %)
                                    labelLine={true} // Hiện đường kẻ chỉ dẫn
                                >
                                    {data.statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <RechartsTooltip formatter={(val) => `${val} sản phẩm`} />
                                {/* Legend có thể bỏ nếu muốn gọn, hoặc giữ lại để chú thích màu */}
                                <Legend verticalAlign="bottom" wrapperStyle={{paddingTop: '20px'}} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div style={emptyStateStyle}>Chưa có đơn hàng nào</div>
                    )}
                </div>
            </div>
          </div>

          {/* 3. BOTTOM SECTION (Tables) */}
          <div className="grid-bottom" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '25px' }}>
            
            {/* Đơn Hàng Mới Nhất */}
            <div style={cardStyle}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'20px', alignItems:'center' }}>
                    <h3 style={cardTitleStyle}>📋 Đơn Vừa Đặt</h3>
                    <Link to="/admin/orders" style={{color:'#0984e3', textDecoration:'none', fontWeight:'600', fontSize:'0.9rem'}}>Xem tất cả &rarr;</Link>
                </div>
                <div style={{overflowX: 'auto'}}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', color: '#636e72', fontSize: '0.85rem', borderBottom: '2px solid #f1f5f9' }}>
                                <th style={{padding:'12px'}}>Mã Đơn</th>
                                <th style={{padding:'12px'}}>Khách Hàng</th>
                                <th style={{padding:'12px'}}>Tổng Tiền</th>
                                <th style={{padding:'12px'}}>Trạng Thái</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.donMoi && data.donMoi.length > 0 ? data.donMoi.slice(0, 5).map((order) => (
                                <tr key={order.maDonHang || order.MaDonHang} style={{ borderBottom: '1px dashed #f1f5f9' }}>
                                    <td style={{padding:'12px', fontWeight:'bold', color:'#2d3436'}}>
                                        #{order.maDonHang || order.MaDonHang}
                                    </td>
                                    <td style={{padding:'12px', fontSize:'0.9rem'}}>
                                        {order.nguoiNhan || order.NguoiNhan || 'Khách vãng lai'}
                                    </td>
                                    <td style={{padding:'12px', fontWeight:'bold', color:'#e64a19'}}>
                                        {(order.tongTien || order.TongTien || 0).toLocaleString()}đ
                                    </td>
                                    <td style={{padding:'12px'}}>
                                        {getStatusBadge(order.trangThai || order.TrangThai)}
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="4" style={emptyStateStyle}>Chưa có đơn hàng mới</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Top Bán Chạy */}
            <div style={cardStyle}>
                <h3 style={cardTitleStyle}>👑 Món Ăn Ngôi Sao</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop:'10px' }}>
                    {data.topSanPham && data.topSanPham.length > 0 ? data.topSanPham.slice(0, 5).map((item, idx) => (
                        <div key={idx} style={{ display:'flex', alignItems:'center', gap:'15px', paddingBottom:'10px', borderBottom: idx < 4 ? '1px dashed #f1f5f9' : 'none' }}>
                            <div style={{
                                width:'32px', height:'32px', borderRadius:'50%', 
                                background: idx === 0 ? '#ff7675' : (idx === 1 ? '#fdcb6e' : (idx === 2 ? '#74b9ff' : '#f1f2f6')), 
                                color: idx < 3 ? '#fff' : '#636e72', 
                                display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold', fontSize:'0.9rem'
                            }}>
                                {idx + 1}
                            </div>
                            
                            <div style={{width:'40px', height:'40px', borderRadius:'8px', overflow:'hidden', background:'#eee'}}>
                                <img 
                                    src={item.hinhAnh || item.HinhAnh || 'https://placehold.co/40'} 
                                    alt="mon" 
                                    style={{width:'100%', height:'100%', objectFit:'cover'}} 
                                    onError={(e) => e.target.src = 'https://placehold.co/40'}
                                />
                            </div>

                            <div style={{flex:1}}>
                                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                    <span style={{fontWeight:'600', color:'#2d3436', fontSize:'0.95rem'}}>{item.tenMon || item.TenMon}</span>
                                    <span style={{fontWeight:'700', color:'#0984e3', fontSize:'0.9rem'}}>
                                        {item.soLuongBan || item.SoLuongBan} <span style={{fontSize:'0.8rem', fontWeight:'400', color:'#b2bec3'}}>bán</span>
                                    </span>
                                </div>
                                <div style={{fontSize:'0.8rem', color:'#b2bec3'}}>
                                    Doanh thu: {(item.doanhThu || item.DoanhThu || 0).toLocaleString()}đ
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div style={emptyStateStyle}>Chưa có dữ liệu bán hàng</div>
                    )}
                </div>
            </div>

          </div>
        </>
      )}
      
      <style>{`
          .fa-spin { animation: spin 1s infinite linear; }
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @media (max-width: 900px) { 
              .grid-charts, .grid-bottom { grid-template-columns: 1fr !important; } 
          }
      `}</style>
    </div>
  );
}

// Sub Components
const KpiCard = ({ title, value, unit, icon, color, bg }) => (
    <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transition:'transform 0.2s' }} 
         onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
         onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
    >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', color: color }}>
                {icon}
            </div>
        </div>
        <div>
            <div style={{ color: '#636e72', fontSize: '0.9rem', fontWeight: '600' }}>{title}</div>
            <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#2d3436', marginTop: '5px' }}>
                {value} <span style={{fontSize:'1rem', color:'#b2bec3', fontWeight:'500'}}>{unit}</span>
            </div>
        </div>
    </div>
);

// Styles
const cardStyle = { background: '#fff', borderRadius: '20px', padding: '25px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9' };
const cardTitleStyle = { color: '#2d3436', margin: 0, fontSize: '1.1rem', display:'flex', alignItems:'center', fontWeight:'700', marginBottom:'20px' };
const controlStyle = { padding: '8px 12px', borderRadius: '8px', border: '1px solid #dfe6e9', outline: 'none', background: '#fff', color: '#2d3436', fontWeight: '600', cursor: 'pointer', fontSize:'0.9rem' };
const iconBtnStyle = { width:'36px', height:'36px', borderRadius:'8px', border:'1px solid #dfe6e9', background:'#fff', color:'#636e72', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:'1rem' };
const primaryBtnStyle = { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#0984e3', color: '#fff', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 10px rgba(9, 132, 227, 0.3)', fontSize:'0.9rem' };
const emptyStateStyle = { textAlign:'center', paddingTop:'50px', paddingBottom:'50px', color:'#b2bec3', fontStyle:'italic' };

export default AdminDashboard;