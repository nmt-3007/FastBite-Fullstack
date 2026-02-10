import React from 'react';
import { FaBoxes } from 'react-icons/fa';

function AdminInventory() {
  return (
    <div style={{ padding: '20px', background: '#fff', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', minHeight: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <FaBoxes size={50} color="#e67e22" style={{ marginBottom: '20px' }} />
      <h2 style={{ color: '#2d3436' }}>📦 Quản Lý Kho Hàng</h2>
      <p style={{ color: '#636e72' }}>Tính năng đang được xây dựng...</p>
    </div>
  );
}

export default AdminInventory;