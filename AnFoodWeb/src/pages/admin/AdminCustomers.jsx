import React, { useEffect, useState, useMemo } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import { 
  FaUser, FaSearch, FaTrash, FaEnvelope, FaPhone, FaMapMarkerAlt, 
  FaUserShield, FaUserTag, FaKey, FaUsers, FaBan, FaUnlock
} from 'react-icons/fa';
import 'react-toastify/dist/ReactToastify.css';

// ✅ SỬ DỤNG AXIOS ADMIN (Đã có token và interceptor)
import axiosAdmin from '../../api/axiosAdmin';

function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // ✅ 1. QUAN TRỌNG NHẤT: Tự động gọi API khi mở trang
  useEffect(() => {
    fetchCustomers();
  }, []);

  // --- HÀM TẢI DỮ LIỆU ---
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      
      const response = await axiosAdmin.get('/NguoiDung');
      
      console.log("🔥 DỮ LIỆU GỐC TỪ SERVER:", response);

      // Tìm mảng dữ liệu (Xử lý mọi trường hợp trả về)
      let rawList = [];
      if (Array.isArray(response)) {
          rawList = response;
      } else if (response && Array.isArray(response.data)) {
          rawList = response.data;
      } else if (response && Array.isArray(response.result)) {
          rawList = response.result;
      } else if (response && Array.isArray(response.content)) {
          rawList = response.content;
      }

      // Chuẩn hóa Key (Map chữ Hoa -> chữ Thường để tránh lỗi undefined)
      const normalizedList = rawList.map(item => ({
          maNguoiDung: item.maNguoiDung || item.MaNguoiDung || item.id || item.ID,
          hoTen:       item.hoTen || item.HoTen || item.fullName || item.FullName || "Người dùng",
          email:       item.email || item.Email || "",
          soDienThoai: item.soDienThoai || item.SoDienThoai || item.PhoneNumber || "",
          diaChi:      item.diaChi || item.DiaChi || item.Address || "Chưa cập nhật",
          vaiTro:      (item.vaiTro || item.VaiTro || "user").toLowerCase(),
          isDeleted:   item.isDeleted || item.IsDeleted || false // Nhận trạng thái xóa mềm
      }));

      // Sắp xếp: Admin lên đầu, sau đó đến user thường, user bị khóa xuống cuối
      normalizedList.sort((a, b) => {
          if (a.vaiTro === 'admin') return -1;
          if (b.vaiTro === 'admin') return 1;
          return a.isDeleted - b.isDeleted;
      });

      setCustomers(normalizedList);

    } catch (err) {
      console.error("Lỗi tải khách hàng:", err);
      if (err.response && err.response.status !== 403) {
          toast.error("❌ Không thể tải danh sách khách hàng.");
      }
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIC TÌM KIẾM ---
  const filteredCustomers = useMemo(() => {
    return customers.filter(user =>
      (user.hoTen && user.hoTen.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.soDienThoai && user.soDienThoai.includes(searchTerm)) ||
      (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [customers, searchTerm]);

  // --- LOGIC THỐNG KÊ ---
  const stats = useMemo(() => {
    return {
        total: customers.length,
        admins: customers.filter(c => c.vaiTro === 'admin').length,
        users: customers.filter(c => c.vaiTro !== 'admin' && !c.isDeleted).length, // Chỉ đếm user đang hoạt động
        locked: customers.filter(c => c.isDeleted).length // Đếm user bị khóa
    };
  }, [customers]);

  // --- XỬ LÝ KHÓA TÀI KHOẢN (SOFT DELETE) ---
  const handleLockUser = async (id) => {
    if (window.confirm("⚠️ CẢNH BÁO: Bạn có chắc muốn KHÓA tài khoản này? Người dùng sẽ không thể đăng nhập.")) {
      try {
        await axiosAdmin.delete(`/NguoiDung/${id}`);
        toast.success("🔒 Đã khóa tài khoản thành công");
        fetchCustomers(); // Tải lại danh sách để cập nhật trạng thái
      } catch (err) {
        const msg = err.response?.data?.message || "Không thể khóa tài khoản";
        toast.error("❌ " + msg);
      }
    }
  };

  // --- XỬ LÝ MỞ KHÓA (RESTORE) ---
  const handleUnlockUser = async (id) => {
    if (window.confirm("🔓 Bạn muốn MỞ KHÓA tài khoản này?")) {
      try {
        await axiosAdmin.put(`/NguoiDung/Restore/${id}`);
        toast.success("✅ Đã mở khóa tài khoản thành công");
        fetchCustomers(); // Tải lại danh sách
      } catch (err) {
        const msg = err.response?.data?.message || "Không thể mở khóa";
        toast.error("❌ " + msg);
      }
    }
  };

  // --- 🔐 CẤP LẠI MẬT KHẨU ---
  const handleResetPassword = (user) => {
    if (user.isDeleted) {
        return toast.warning("🚫 Không thể cấp lại mật khẩu cho tài khoản đang bị khóa!");
    }

    const newPassword = Math.random().toString(36).slice(-8).toUpperCase();
    navigator.clipboard.writeText(newPassword)
        .then(() => toast.success(`📋 Đã copy mật khẩu mới: ${newPassword}`))
        .catch(() => toast.info(`Mật khẩu mới: ${newPassword}`));

    const subject = encodeURIComponent("Cấp lại Mật Khẩu Mới - FastBite Support");
    const body = encodeURIComponent(
      `Xin chào ${user.hoTen},\n\n` +
      `Chúng tôi nhận được yêu cầu cấp lại mật khẩu của bạn.\n` +
      `🔐 Mật khẩu tạm thời mới của bạn là: ${newPassword}\n\n` +
      `Vui lòng đăng nhập và đổi lại mật khẩu ngay lập tức để bảo mật.\n\n` +
      `Trân trọng,\nĐội ngũ FastBite.`
    );

    setTimeout(() => {
        window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${user.email}&su=${subject}&body=${body}`, '_blank');
    }, 1000);
  };

  // Helper Avatar
  const getAvatar = (name) => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&bold=true&size=128`;
  };

  return (
    <div style={{ padding: '30px', background: '#f8f9fa', minHeight: '100vh', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
      <ToastContainer position="top-right" autoClose={3000} theme="colored" />
      
      {/* HEADER & SEARCH */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '20px' }}>
        <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#2d3436', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                <FaUserTag color="#e64a19" /> Quản Lý Khách Hàng
            </h2>
            <p style={{ color: '#636e72', margin: '5px 0 0' }}>Quản lý thông tin và tài khoản người dùng hệ thống</p>
        </div>
        
        <div style={{ position: 'relative', width: '350px' }}>
          <FaSearch style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#b2bec3' }} />
          <input 
            type="text" 
            placeholder="Tìm kiếm theo tên, SĐT, Email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '12px 15px 12px 45px', borderRadius: '50px', border: '1px solid #dfe6e9', outline: 'none', boxShadow: '0 4px 10px rgba(0,0,0,0.03)', transition: '0.3s' }}
            onFocus={e => e.target.style.borderColor = '#e64a19'}
            onBlur={e => e.target.style.borderColor = '#dfe6e9'}
          />
        </div>
      </div>

      {/* STATS CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={statCardStyle('#e3f2fd', '#0984e3')}>
            <div>
                <div style={{fontSize:'2rem', fontWeight:'bold'}}>{stats.total}</div>
                <div style={{fontSize:'0.9rem', opacity:0.8}}>Tổng tài khoản</div>
            </div>
            <FaUsers size={35} opacity={0.3} />
        </div>
        <div style={statCardStyle('#fff3e0', '#e67e22')}>
            <div>
                <div style={{fontSize:'2rem', fontWeight:'bold'}}>{stats.users}</div>
                <div style={{fontSize:'0.9rem', opacity:0.8}}>Đang hoạt động</div>
            </div>
            <FaUser size={30} opacity={0.3} />
        </div>
        <div style={statCardStyle('#ffebee', '#c0392b')}>
            <div>
                <div style={{fontSize:'2rem', fontWeight:'bold'}}>{stats.locked}</div>
                <div style={{fontSize:'0.9rem', opacity:0.8}}>Đã bị khóa</div>
            </div>
            <FaBan size={30} opacity={0.3} />
        </div>
      </div>

      {/* TABLE LIST */}
      <div style={{ background: '#fff', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        {loading ? <div style={{padding:'50px', textAlign:'center', color:'#999'}}>Đang tải dữ liệu...</div> : (
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1000px' }}>
                <thead>
                    <tr style={{ background: '#f8f9fa', color: '#636e72', textAlign: 'left', fontSize: '0.9rem', borderBottom: '2px solid #eee' }}>
                    <th style={{ padding: '20px' }}>Hồ sơ người dùng</th>
                    <th style={{ padding: '20px' }}>Thông tin liên hệ</th>
                    <th style={{ padding: '20px' }}>Địa chỉ</th>
                    <th style={{ padding: '20px', textAlign: 'center' }}>Trạng thái</th>
                    <th style={{ padding: '20px', textAlign: 'center' }}>Bảo mật</th>
                    <th style={{ padding: '20px', textAlign: 'center' }}>Hành động</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredCustomers.length > 0 ? filteredCustomers.map(user => (
                    <tr key={user.maNguoiDung} 
                        style={{ 
                            borderBottom: '1px solid #f1f2f6', 
                            transition: '0.2s',
                            opacity: user.isDeleted ? 0.6 : 1, // Làm mờ user bị khóa
                            background: user.isDeleted ? '#fdfdfd' : '#fff'
                        }} 
                        className="hover-row">
                        
                        {/* INFO */}
                        <td style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <img 
                                src={getAvatar(user.hoTen)} 
                                alt={user.hoTen} 
                                style={{ 
                                    width: '50px', height: '50px', borderRadius: '15px', 
                                    boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                                    filter: user.isDeleted ? 'grayscale(100%)' : 'none' 
                                }} 
                            />
                            <div>
                            <div style={{ fontWeight: '700', color: '#2d3436', fontSize:'1rem' }}>{user.hoTen}</div>
                            <div style={{ fontSize: '0.8rem', color: '#95a5a6', marginTop:'3px' }}>ID: <span style={{fontFamily:'monospace', background:'#eee', padding:'2px 5px', borderRadius:'4px'}}>#{user.maNguoiDung}</span></div>
                            </div>
                        </div>
                        </td>

                        {/* CONTACT */}
                        <td style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', fontSize: '0.9rem', color: '#2d3436' }}>
                            <div style={{background:'#fff0e6', padding:'6px', borderRadius:'50%', color:'#e64a19'}}><FaEnvelope size={12}/></div> 
                            {user.email || '---'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: '#2d3436' }}>
                            <div style={{background:'#e3f2fd', padding:'6px', borderRadius:'50%', color:'#0984e3'}}><FaPhone size={12}/></div>
                            {user.soDienThoai || '---'}
                        </div>
                        </td>

                        {/* ADDRESS */}
                        <td style={{ padding: '20px', color: '#636e72', fontSize: '0.9rem', maxWidth:'250px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                            <FaMapMarkerAlt style={{ marginTop: '3px', color: '#ff6b6b', flexShrink:0 }} /> 
                            <span style={{lineHeight:'1.4'}}>{user.diaChi || 'Chưa cập nhật địa chỉ'}</span>
                        </div>
                        </td>

                        {/* ROLE & STATUS */}
                        <td style={{ padding: '20px', textAlign: 'center' }}>
                        {user.vaiTro === 'admin' ? (
                            <span style={{ background: '#2d3436', color: '#fff', padding: '6px 15px', borderRadius: '30px', fontSize: '0.75rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '6px', boxShadow:'0 4px 10px rgba(45, 52, 54, 0.3)' }}>
                            <FaUserShield /> ADMIN
                            </span>
                        ) : user.isDeleted ? (
                            <span style={{ background: '#ffebee', color: '#c0392b', padding: '6px 15px', borderRadius: '30px', fontSize: '0.75rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <FaBan /> ĐÃ KHÓA
                            </span>
                        ) : (
                            <span style={{ background: '#e8f5e9', color: '#27ae60', padding: '6px 15px', borderRadius: '30px', fontSize: '0.75rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <FaUser /> MEMBER
                            </span>
                        )}
                        </td>

                        {/* RESET PASSWORD */}
                        <td style={{ padding: '20px', textAlign: 'center' }}>
                        <button 
                            onClick={() => handleResetPassword(user)}
                            title="Tạo mật khẩu mới & Gửi mail"
                            style={actionBtnStyle('#fff3e0', '#e67e22')}
                            disabled={user.isDeleted} // Khóa nút nếu user bị khóa
                        >
                            <FaKey />
                        </button>
                        </td>

                        {/* ACTION (LOCK/UNLOCK) */}
                        <td style={{ padding: '20px', textAlign: 'center' }}>
                        {user.vaiTro !== 'admin' && (
                            user.isDeleted ? (
                                <button 
                                    onClick={() => handleUnlockUser(user.maNguoiDung)} 
                                    style={actionBtnStyle('#e8f5e9', '#27ae60')}
                                    title="Mở khóa tài khoản"
                                >
                                    <FaUnlock />
                                </button>
                            ) : (
                                <button 
                                    onClick={() => handleLockUser(user.maNguoiDung)} 
                                    style={actionBtnStyle('#ffebee', '#c0392b')}
                                    title="Khóa tài khoản"
                                >
                                    <FaBan />
                                </button>
                            )
                        )}
                        </td>

                    </tr>
                    )) : (
                        <tr><td colSpan="6" style={{ padding: '50px', textAlign: 'center', color: '#95a5a6' }}>Không tìm thấy dữ liệu.</td></tr>
                    )}
                </tbody>
                </table>
            </div>
        )}
      </div>

      {/* CSS Hover Effect */}
      <style>{`
        .hover-row:hover { background-color: #fcfcfc !important; }
      `}</style>
    </div>
  );
}

// STYLES HELPER
const statCardStyle = (bg, color) => ({
    background: bg, color: color, padding: '20px', borderRadius: '15px', 
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    boxShadow: '0 4px 10px rgba(0,0,0,0.03)', border: `1px solid ${bg}`
});

const actionBtnStyle = (bg, color) => ({
    width: '40px', height: '40px', borderRadius: '12px', 
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', 
    background: bg, color: color, border: 'none', cursor: 'pointer', 
    transition: '0.2s', fontSize: '1rem', marginLeft:'5px'
});

export default AdminCustomers;