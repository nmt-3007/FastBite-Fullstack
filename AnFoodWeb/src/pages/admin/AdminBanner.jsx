import React, { useEffect, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import {
    FaEdit,
    FaTrash,
    FaCloudUploadAlt,
    FaImages
} from 'react-icons/fa';

import 'react-toastify/dist/ReactToastify.css';

// ✅ Axios Admin
import axiosAdmin from '../../api/axiosAdmin';

const AdminBanner = () => {

    // =========================
    // STATE
    // =========================
    const [banners, setBanners] = useState([]);
    const [foods, setFoods] = useState([]);
    const [categories, setCategories] = useState([]);

    const [formData, setFormData] = useState({
        tieuDe: '',
        moTa: '',
        phanTramGiam: 0,
        kichHoat: true,
        maMon: '',
        maDanhMuc: ''
    });

    const [applyType, setApplyType] = useState('food');
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // =========================
    // FIX QUAN TRỌNG
    // DÙNG API_ROOT CHO ẢNH
    // =========================
    const API_HOST =
        import.meta.env.VITE_API_ROOT || 'http://localhost:5010';

    // =========================
    // IMAGE URL
    // =========================
    const getImageUrl = (imagePath) => {
        if (!imagePath) return null;

        if (imagePath.startsWith('http')) {
            return imagePath;
        }

        const path = imagePath.startsWith('/')
            ? imagePath
            : `/${imagePath}`;

        return `${API_HOST}${path}`;
    };

    // =========================
    // FETCH DATA
    // =========================
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);

        try {

            const [bannerRes, foodRes, catRes] = await Promise.all([
                axiosAdmin.get('/QuangCao'),
                axiosAdmin.get('/MonAn'),
                axiosAdmin.get('/DanhMuc')
            ]);

            setBanners(Array.isArray(bannerRes) ? bannerRes : []);

            const fData = Array.isArray(foodRes)
                ? foodRes
                : (foodRes.data || []);

            setFoods(
                fData.map(m => ({
                    maMon: m.maMon || m.MaMon || m.id,
                    tenMon: m.tenMon || m.TenMon,
                    gia: m.gia || m.Gia
                }))
            );

            const cData = Array.isArray(catRes)
                ? catRes
                : (catRes.data || []);

            setCategories(
                cData.map(c => ({
                    maDanhMuc: c.maDanhMuc || c.MaDanhMuc || c.id,
                    tenDanhMuc: c.tenDanhMuc || c.TenDanhMuc
                }))
            );

        } catch (err) {
            console.error(err);
            toast.error("Không thể tải dữ liệu.");
        } finally {
            setIsLoading(false);
        }
    };

    // =========================
    // FILE CHANGE
    // =========================
    const handleFileChange = (e) => {

        const file = e.target.files[0];

        if (file) {
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    // =========================
    // SUBMIT
    // =========================
    const handleSubmit = async (e) => {

        e.preventDefault();

        if (!formData.tieuDe.trim()) {
            return toast.warning("⚠️ Nhập tiêu đề!");
        }

        if (applyType === 'food' && !formData.maMon) {
            return toast.warning("⚠️ Chọn món ăn!");
        }

        if (applyType === 'category' && !formData.maDanhMuc) {
            return toast.warning("⚠️ Chọn danh mục!");
        }

        const data = new FormData();

        data.append('tieuDe', formData.tieuDe);
        data.append('moTa', formData.moTa || '');
        data.append('phanTramGiam', formData.phanTramGiam);
        data.append('kichHoat', formData.kichHoat);

        if (applyType === 'food') {
            data.append('maMon', formData.maMon);
            data.append('maDanhMuc', '');
        } else {
            data.append('maDanhMuc', formData.maDanhMuc);
            data.append('maMon', '');
        }

        if (selectedFile) {
            data.append('imageFile', selectedFile);
        }

        try {

            const config = {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            };

            if (isEditing) {

                data.append('maQuangCao', editId);

                await axiosAdmin.put(
                    `/QuangCao/${editId}`,
                    data,
                    config
                );

                toast.success("✅ Cập nhật thành công!");

            } else {

                await axiosAdmin.post(
                    '/QuangCao',
                    data,
                    config
                );

                toast.success("🎉 Thêm mới thành công!");
            }

            resetForm();
            fetchData();

        } catch (error) {

            toast.error(
                "❌ Lỗi: " +
                (error.response?.data?.message || error.message)
            );
        }
    };

    // =========================
    // RESET FORM
    // =========================
    const resetForm = () => {

        setFormData({
            tieuDe: '',
            moTa: '',
            phanTramGiam: 0,
            kichHoat: true,
            maMon: '',
            maDanhMuc: ''
        });

        setSelectedFile(null);
        setPreviewUrl('');
        setIsEditing(false);
        setEditId(null);
        setApplyType('food');
    };

    // =========================
    // DELETE
    // =========================
    const handleDelete = async (id) => {

        if (window.confirm("Xóa banner này?")) {

            try {

                await axiosAdmin.delete(`/QuangCao/${id}`);

                setBanners(prev =>
                    prev.filter(
                        b => (b.maQuangCao || b.MaQuangCao) !== id
                    )
                );

                toast.success("Đã xóa!");

            } catch (err) {

                toast.error("Lỗi xóa!");
            }
        }
    };

    // =========================
    // EDIT
    // =========================
    const handleEdit = (item) => {

        setIsEditing(true);

        setEditId(item.maQuangCao || item.MaQuangCao);

        const type =
            (item.maDanhMuc || item.MaDanhMuc)
                ? 'category'
                : 'food';

        setApplyType(type);

        setFormData({
            tieuDe: item.tieuDe || item.TieuDe,
            moTa: item.moTa || item.MoTa || '',
            phanTramGiam:
                item.phanTramGiam ||
                item.PhanTramGiam ||
                0,

            kichHoat:
                item.kichHoat !== undefined
                    ? item.kichHoat
                    : item.KichHoat,

            maMon:
                item.maMon ||
                item.MaMon ||
                '',

            maDanhMuc:
                item.maDanhMuc ||
                item.MaDanhMuc ||
                ''
        });

        setPreviewUrl(
            getImageUrl(item.hinhAnh || item.HinhAnh)
        );

        setSelectedFile(null);

        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    return (
        <div>
            <ToastContainer autoClose={2000} theme="colored" />
        </div>
    );
};

export default AdminBanner;