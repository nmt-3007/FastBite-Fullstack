using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using Pomelo.EntityFrameworkCore.MySql.Scaffolding.Internal;

namespace AnFoodAPI.Models;

public partial class AnshopDbContext : DbContext
{
    public AnshopDbContext()
    {
    }

    public AnshopDbContext(DbContextOptions<AnshopDbContext> options)
        : base(options)
    {
    }

    // --- DANH SÁCH BẢNG ---
    public virtual DbSet<ChiTietDonHang> ChiTietDonHangs { get; set; }
    public virtual DbSet<ChiTietGioHang> ChiTietGioHangs { get; set; }
    public virtual DbSet<DanhGia> DanhGia { get; set; }
    public virtual DbSet<QuangCao> QuangCaos { get; set; } // ✅ Đã có
    public virtual DbSet<DanhMuc> DanhMucs { get; set; }
    public virtual DbSet<DiaChiGiaoHang> DiaChiGiaoHangs { get; set; }
    public virtual DbSet<DonHang> DonHangs { get; set; }
    public virtual DbSet<GioHang> GioHangs { get; set; }
    public virtual DbSet<GoiYAi> GoiYAis { get; set; }
    public virtual DbSet<HanhViNguoiDung> HanhViNguoiDungs { get; set; }
    public virtual DbSet<HinhAnhMonAn> HinhAnhMonAns { get; set; }
    public virtual DbSet<LichSuTrangThaiDonHang> LichSuTrangThaiDonHangs { get; set; }
    public virtual DbSet<LienHe> LienHes { get; set; }
    public virtual DbSet<MonAn> MonAns { get; set; }
    public virtual DbSet<NguoiDung> NguoiDungs { get; set; }
    public virtual DbSet<QuyTacThoiGian> QuyTacThoiGians { get; set; }
    public virtual DbSet<Quyen> Quyens { get; set; }
    public virtual DbSet<ThanhToan> ThanhToans { get; set; }
    public virtual DbSet<ThoiTiet> ThoiTiets { get; set; }
    public virtual DbSet<ThongBao> ThongBaos { get; set; }
    public virtual DbSet<VaiTro> VaiTros { get; set; }
    public virtual DbSet<YeuThich> YeuThiches { get; set; }
    // Đảm bảo có dòng này trong file AnshopDbContext.cs
public virtual DbSet<DanhGia> DanhGias { get; set; } = null!;
    

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        => optionsBuilder.UseMySql("server=localhost;database=anshop_db;user=root", Microsoft.EntityFrameworkCore.ServerVersion.Parse("10.4.32-mariadb"));

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder
            .UseCollation("utf8mb4_unicode_ci")
            .HasCharSet("utf8mb4");

        // --- CẤU HÌNH CHI TIẾT ĐƠN HÀNG ---
        modelBuilder.Entity<ChiTietDonHang>(entity =>
        {
            entity.HasKey(e => e.MaChiTiet).HasName("PRIMARY");
            entity.ToTable("chi_tiet_don_hang");
            entity.HasIndex(e => e.MaDonHang, "ma_don_hang");
            entity.HasIndex(e => e.MaMon, "ma_mon");

            entity.Property(e => e.MaChiTiet).HasColumnType("int(11)").HasColumnName("ma_chi_tiet");
            
            // ✅ CHUẨN: Đã map đủ DonGia và GiaBan
            entity.Property(e => e.DonGia).HasColumnType("decimal(18, 2)").HasColumnName("don_gia");
            entity.Property(e => e.GiaBan).HasColumnType("decimal(18, 2)").HasColumnName("gia_ban"); // 👈 MỚI THÊM

            entity.Property(e => e.MaDonHang).HasColumnType("int(11)").HasColumnName("ma_don_hang");
            entity.Property(e => e.MaMon).HasColumnType("int(11)").HasColumnName("ma_mon");
            entity.Property(e => e.SoLuong).HasColumnType("int(11)").HasColumnName("so_luong");
        });

        // --- CẤU HÌNH CHI TIẾT GIỎ HÀNG ---
        modelBuilder.Entity<ChiTietGioHang>(entity =>
        {
            entity.HasKey(e => e.MaChiTietGio).HasName("PRIMARY");
            entity.ToTable("chi_tiet_gio_hang");
            entity.HasIndex(e => e.MaGioHang, "ma_gio_hang");
            entity.HasIndex(e => e.MaMon, "ma_mon");

            entity.Property(e => e.MaChiTietGio).HasColumnType("int(11)").HasColumnName("ma_chi_tiet");
            entity.Property(e => e.MaGioHang).HasColumnType("int(11)").HasColumnName("ma_gio_hang");
            entity.Property(e => e.MaMon).HasColumnType("int(11)").HasColumnName("ma_mon");
            entity.Property(e => e.SoLuong).HasColumnType("int(11)").HasColumnName("so_luong");
        });

        // --- CẤU HÌNH ĐÁNH GIÁ ---
        modelBuilder.Entity<DanhGia>(entity =>
        {
            entity.HasKey(e => e.MaDanhGia).HasName("PRIMARY");
            entity.ToTable("danh_gia");
            entity.HasIndex(e => e.MaMon, "ma_mon");
            entity.HasIndex(e => e.MaNguoiDung, "ma_nguoi_dung");

            entity.Property(e => e.MaDanhGia).HasColumnType("int(11)").HasColumnName("ma_danh_gia");
            entity.Property(e => e.MaMon).HasColumnType("int(11)").HasColumnName("ma_mon");
            entity.Property(e => e.MaNguoiDung).HasColumnType("int(11)").HasColumnName("ma_nguoi_dung");
            entity.Property(e => e.NgayDanhGia).HasDefaultValueSql("current_timestamp()").HasColumnType("datetime").HasColumnName("ngay_danh_gia");
            entity.Property(e => e.NhanXet).HasColumnType("text").HasColumnName("nhan_xet");
            entity.Property(e => e.SoSao).HasColumnType("int(11)").HasColumnName("so_sao");

 //           entity.Property(e => e.NhanXet).HasColumnType("text").HasColumnName("nhan_xet");
            entity.Property(e => e.SoSao).HasColumnType("int(11)").HasColumnName("so_sao");

            // 👇 DÁN ĐOẠN NÀY VÀO ĐÂY (Code map đúng khóa ngoại)
            entity.HasOne<MonAn>()
                .WithMany(p => p.DanhGia) // Liên kết với danh sách bên bảng MonAn
                .HasForeignKey(d => d.MaMon) // Chỉ định dùng cột 'ma_mon' thật
                .OnDelete(DeleteBehavior.ClientSetNull);

            entity.HasOne<NguoiDung>()
                .WithMany(p => p.DanhGia) // Liên kết với danh sách bên bảng NguoiDung
                .HasForeignKey(d => d.MaNguoiDung) // Chỉ định dùng cột 'ma_nguoi_dung' thật
                .OnDelete(DeleteBehavior.ClientSetNull);

        });

        modelBuilder.Entity<DanhMuc>(entity =>
        {
            entity.HasKey(e => e.MaDanhMuc).HasName("PRIMARY");
            entity.ToTable("danh_muc");
            entity.Property(e => e.MaDanhMuc).HasColumnType("int(11)").HasColumnName("ma_danh_muc");
            entity.Property(e => e.MoTa).HasColumnType("text").HasColumnName("mo_ta");
            entity.Property(e => e.TenDanhMuc).HasMaxLength(100).HasColumnName("ten_danh_muc");
        });

        modelBuilder.Entity<DiaChiGiaoHang>(entity =>
        {
            entity.HasKey(e => e.MaDiaChi).HasName("PRIMARY");
            entity.ToTable("dia_chi_giao_hang");
            entity.HasIndex(e => e.MaNguoiDung, "ma_nguoi_dung");

            entity.Property(e => e.MaDiaChi).HasColumnType("int(11)").HasColumnName("ma_dia_chi");
            entity.Property(e => e.DiaChi).HasColumnType("text").HasColumnName("dia_chi");
            entity.Property(e => e.HoTenNguoiNhan).HasMaxLength(100).HasColumnName("ho_ten_nguoi_nhan");
            entity.Property(e => e.MaNguoiDung).HasColumnType("int(11)").HasColumnName("ma_nguoi_dung");
            entity.Property(e => e.MacDinh).HasDefaultValueSql("'0'").HasColumnName("mac_dinh");
            entity.Property(e => e.NgayTao).HasDefaultValueSql("current_timestamp()").HasColumnType("datetime").HasColumnName("ngay_tao");
            entity.Property(e => e.SoDienThoai).HasMaxLength(20).HasColumnName("so_dien_thoai");

            entity.HasOne(d => d.MaNguoiDungNavigation).WithMany(p => p.DiaChiGiaoHangs).HasForeignKey(d => d.MaNguoiDung).HasConstraintName("dia_chi_giao_hang_ibfk_1");
        });

        // --- CẤU HÌNH ĐƠN HÀNG ---
        modelBuilder.Entity<DonHang>(entity =>
        {
            entity.HasKey(e => e.MaDonHang).HasName("PRIMARY");
            entity.ToTable("don_hang");
            entity.HasIndex(e => e.MaDiaChi, "ma_dia_chi");
            entity.HasIndex(e => e.MaNguoiDung, "ma_nguoi_dung");

            entity.Property(e => e.MaDonHang).HasColumnType("int(11)").HasColumnName("ma_don_hang");
            entity.Property(e => e.MaDiaChi).HasColumnType("int(11)").HasColumnName("ma_dia_chi");
            entity.Property(e => e.MaNguoiDung).HasColumnType("int(11)").HasColumnName("ma_nguoi_dung");
            entity.Property(e => e.NgayDat).HasDefaultValueSql("current_timestamp()").HasColumnType("datetime").HasColumnName("ngay_dat");
            entity.Property(e => e.TongTien).HasPrecision(10, 2).HasColumnName("tong_tien");
            entity.Property(e => e.TrangThai).HasColumnType("enum('cho_xu_ly','dang_giao','hoan_thanh','huy','ChoDuyet')").HasColumnName("trang_thai");

            entity.Property(e => e.NguoiNhan).HasMaxLength(255).HasColumnName("nguoi_nhan");
            entity.Property(e => e.SoDienThoai).HasMaxLength(20).HasColumnName("so_dien_thoai");
            entity.Property(e => e.DiaChiGiaoHang).HasColumnType("text").HasColumnName("dia_chi_giao_hang");
            entity.Property(e => e.GhiChu).HasColumnType("text").HasColumnName("ghi_chu");
        });

        modelBuilder.Entity<GioHang>(entity =>
        {
            entity.HasKey(e => e.MaGioHang).HasName("PRIMARY");
            entity.ToTable("gio_hang");
            entity.HasIndex(e => e.MaNguoiDung, "ma_nguoi_dung");
            entity.Property(e => e.MaGioHang).HasColumnType("int(11)").HasColumnName("ma_gio_hang");
            entity.Property(e => e.MaNguoiDung).HasColumnType("int(11)").HasColumnName("ma_nguoi_dung");
            entity.Property(e => e.NgayTao).HasDefaultValueSql("current_timestamp()").HasColumnType("datetime").HasColumnName("ngay_tao");
            entity.HasOne(d => d.MaNguoiDungNavigation).WithMany(p => p.GioHangs).HasForeignKey(d => d.MaNguoiDung).HasConstraintName("gio_hang_ibfk_1");
        });

        modelBuilder.Entity<GoiYAi>(entity =>
        {
            entity.HasKey(e => e.MaGoiY).HasName("PRIMARY");
            entity.ToTable("goi_y_ai");
            entity.HasIndex(e => e.MaMon, "ma_mon");
            entity.HasIndex(e => e.MaNguoiDung, "ma_nguoi_dung");
            entity.Property(e => e.MaGoiY).HasColumnType("int(11)").HasColumnName("ma_goi_y");
            entity.Property(e => e.Diem).HasColumnName("diem");
            entity.Property(e => e.MaMon).HasColumnType("int(11)").HasColumnName("ma_mon");
            entity.Property(e => e.MaNguoiDung).HasColumnType("int(11)").HasColumnName("ma_nguoi_dung");
            entity.Property(e => e.ThoiGian).HasDefaultValueSql("current_timestamp()").HasColumnType("datetime").HasColumnName("thoi_gian");
            entity.HasOne(d => d.MaMonNavigation).WithMany(p => p.GoiYAis).HasForeignKey(d => d.MaMon).HasConstraintName("goi_y_ai_ibfk_2");
            entity.HasOne(d => d.MaNguoiDungNavigation).WithMany(p => p.GoiYAis).HasForeignKey(d => d.MaNguoiDung).HasConstraintName("goi_y_ai_ibfk_1");
        });

        modelBuilder.Entity<HanhViNguoiDung>(entity =>
        {
            entity.HasKey(e => e.MaHanhVi).HasName("PRIMARY");
            entity.ToTable("hanh_vi_nguoi_dung");
            entity.HasIndex(e => e.MaMon, "ma_mon");
            entity.HasIndex(e => e.MaNguoiDung, "ma_nguoi_dung");
            entity.Property(e => e.MaHanhVi).HasColumnType("int(11)").HasColumnName("ma_hanh_vi");
            entity.Property(e => e.HanhVi).HasColumnType("enum('xem','them_gio','mua')").HasColumnName("hanh_vi");
            entity.Property(e => e.MaMon).HasColumnType("int(11)").HasColumnName("ma_mon");
            entity.Property(e => e.MaNguoiDung).HasColumnType("int(11)").HasColumnName("ma_nguoi_dung");
            entity.Property(e => e.ThoiGian).HasDefaultValueSql("current_timestamp()").HasColumnType("datetime").HasColumnName("thoi_gian");
            entity.HasOne(d => d.MaMonNavigation).WithMany(p => p.HanhViNguoiDungs).HasForeignKey(d => d.MaMon).HasConstraintName("hanh_vi_nguoi_dung_ibfk_2");
            entity.HasOne(d => d.MaNguoiDungNavigation).WithMany(p => p.HanhViNguoiDungs).HasForeignKey(d => d.MaNguoiDung).HasConstraintName("hanh_vi_nguoi_dung_ibfk_1");
        });

        modelBuilder.Entity<HinhAnhMonAn>(entity =>
        {
            entity.ToTable("hinh_anh_mon_an");
            // Để Model tự định nghĩa
        });

        modelBuilder.Entity<LichSuTrangThaiDonHang>(entity =>
        {
            entity.HasKey(e => e.MaLichSu).HasName("PRIMARY");
            entity.ToTable("lich_su_trang_thai_don_hang");
            entity.HasIndex(e => e.MaDonHang, "ma_don_hang");
            entity.Property(e => e.MaLichSu).HasColumnType("int(11)").HasColumnName("ma_lich_su");
            entity.Property(e => e.GhiChu).HasColumnType("text").HasColumnName("ghi_chu");
            entity.Property(e => e.MaDonHang).HasColumnType("int(11)").HasColumnName("ma_don_hang");
            entity.Property(e => e.ThoiGian).HasDefaultValueSql("current_timestamp()").HasColumnType("datetime").HasColumnName("thoi_gian");
            entity.Property(e => e.TrangThai).HasMaxLength(50).HasColumnName("trang_thai");
            entity.HasOne(d => d.MaDonHangNavigation).WithMany(p => p.LichSuTrangThaiDonHangs).HasForeignKey(d => d.MaDonHang).HasConstraintName("lich_su_trang_thai_don_hang_ibfk_1");
        });

        modelBuilder.Entity<LienHe>(entity =>
        {
            entity.HasKey(e => e.MaLienHe).HasName("PRIMARY");
            entity.ToTable("lien_he");
            entity.Property(e => e.MaLienHe).HasColumnType("int(11)").HasColumnName("ma_lien_he");
            entity.Property(e => e.DaPhanHoi).HasDefaultValueSql("'0'").HasColumnName("da_phan_hoi");
            entity.Property(e => e.Email).HasMaxLength(100).HasColumnName("email");
            entity.Property(e => e.HoTen).HasMaxLength(100).HasColumnName("ho_ten");
            entity.Property(e => e.NgayGui).HasDefaultValueSql("current_timestamp()").HasColumnType("datetime").HasColumnName("ngay_gui");
            entity.Property(e => e.NoiDung).HasColumnType("text").HasColumnName("noi_dung");
            entity.Property(e => e.SoDienThoai).HasMaxLength(20).HasColumnName("so_dien_thoai");
        });

        // --- CẤU HÌNH MÓN ĂN ---
        modelBuilder.Entity<MonAn>(entity =>
        {
            entity.HasKey(e => e.MaMon).HasName("PRIMARY");
            entity.ToTable("mon_an");
            entity.HasIndex(e => e.MaDanhMuc, "ma_danh_muc");

            entity.Property(e => e.MaMon).HasColumnType("int(11)").HasColumnName("ma_mon");
            
            // ✅ CHUẨN: Bổ sung HinhAnh và các cột mới
            entity.Property(e => e.HinhAnh).HasColumnName("hinh_anh"); // 👈 MỚI THÊM
            entity.Property(e => e.BanChay).HasDefaultValueSql("'0'").HasColumnName("ban_chay");
            entity.Property(e => e.TonKho).HasColumnType("int(11)").HasColumnName("ton_kho");
            entity.Property(e => e.LaMonNong).HasDefaultValueSql("'0'").HasColumnName("la_mon_nong");
            entity.Property(e => e.LaDoUongMat).HasDefaultValueSql("'0'").HasColumnName("la_do_uong_mat");
            
            entity.Property(e => e.Gia).HasPrecision(10, 2).HasColumnName("gia");
            entity.Property(e => e.MaDanhMuc).HasColumnType("int(11)").HasColumnName("ma_danh_muc");
            entity.Property(e => e.MoTa).HasColumnType("text").HasColumnName("mo_ta");
            entity.Property(e => e.NgayTao).HasDefaultValueSql("current_timestamp()").HasColumnType("datetime").HasColumnName("ngay_tao");
            entity.Property(e => e.TenMon).HasMaxLength(150).HasColumnName("ten_mon");
            entity.Property(e => e.TrangThai).HasDefaultValueSql("'con_ban'").HasColumnType("enum('con_ban','het_hang')").HasColumnName("trang_thai");

            entity.HasOne(d => d.MaDanhMucNavigation).WithMany(p => p.MonAns).HasForeignKey(d => d.MaDanhMuc).HasConstraintName("mon_an_ibfk_1");
        });

        modelBuilder.Entity<NguoiDung>(entity =>
        {
            entity.HasKey(e => e.MaNguoiDung).HasName("PRIMARY");
            entity.ToTable("nguoi_dung");
            entity.HasIndex(e => e.Email, "email").IsUnique();
            entity.HasIndex(e => e.MaVaiTro, "ma_vai_tro");

            entity.Property(e => e.MaNguoiDung).HasColumnType("int(11)").HasColumnName("ma_nguoi_dung");
            entity.Property(e => e.Email).HasMaxLength(100).HasColumnName("email");
            entity.Property(e => e.HoTen).HasMaxLength(100).HasColumnName("ho_ten");
            entity.Property(e => e.MaVaiTro).HasColumnType("int(11)").HasColumnName("ma_vai_tro");
            entity.Property(e => e.MatKhau).HasMaxLength(255).HasColumnName("mat_khau");
            entity.Property(e => e.NgayTao).HasDefaultValueSql("current_timestamp()").HasColumnType("datetime").HasColumnName("ngay_tao");
            entity.Property(e => e.SoDienThoai).HasMaxLength(20).HasColumnName("so_dien_thoai");
            entity.Property(e => e.TrangThai).HasDefaultValueSql("'hoat_dong'").HasColumnType("enum('hoat_dong','khoa')").HasColumnName("trang_thai");
            
            entity.HasOne(d => d.MaVaiTroNavigation).WithMany(p => p.NguoiDungs).HasForeignKey(d => d.MaVaiTro).HasConstraintName("nguoi_dung_ibfk_1");
        });

        modelBuilder.Entity<QuyTacThoiGian>(entity =>
        {
            entity.HasKey(e => e.MaQuyTac).HasName("PRIMARY");
            entity.ToTable("quy_tac_thoi_gian");
            entity.HasIndex(e => e.MaDanhMuc, "ma_danh_muc");
            entity.Property(e => e.MaQuyTac).HasColumnType("int(11)").HasColumnName("ma_quy_tac");
            entity.Property(e => e.Buoi).HasColumnType("enum('sang','trua','toi')").HasColumnName("buoi");
            entity.Property(e => e.MaDanhMuc).HasColumnType("int(11)").HasColumnName("ma_danh_muc");
            entity.HasOne(d => d.MaDanhMucNavigation).WithMany(p => p.QuyTacThoiGians).HasForeignKey(d => d.MaDanhMuc).HasConstraintName("quy_tac_thoi_gian_ibfk_1");
        });

        modelBuilder.Entity<Quyen>(entity =>
        {
            entity.HasKey(e => e.MaQuyen).HasName("PRIMARY");
            entity.ToTable("quyen");
            entity.Property(e => e.MaQuyen).HasColumnType("int(11)").HasColumnName("ma_quyen");
            entity.Property(e => e.NgayTao).HasDefaultValueSql("current_timestamp()").HasColumnType("datetime").HasColumnName("ngay_tao");
            entity.Property(e => e.TenQuyen).HasMaxLength(100).HasColumnName("ten_quyen");
        });

        modelBuilder.Entity<ThanhToan>(entity =>
        {
            entity.HasKey(e => e.MaThanhToan).HasName("PRIMARY");
            entity.ToTable("thanh_toan");
            entity.HasIndex(e => e.MaDonHang, "ma_don_hang");
            entity.Property(e => e.MaThanhToan).HasColumnType("int(11)").HasColumnName("ma_thanh_toan");
            entity.Property(e => e.MaDonHang).HasColumnType("int(11)").HasColumnName("ma_don_hang");
            entity.Property(e => e.NgayThanhToan).HasDefaultValueSql("current_timestamp()").HasColumnType("datetime").HasColumnName("ngay_thanh_toan");
            entity.Property(e => e.PhuongThuc).HasMaxLength(50).HasColumnName("phuong_thuc");
            entity.Property(e => e.SoTien).HasPrecision(10, 2).HasColumnName("so_tien");
            entity.Property(e => e.TrangThai).HasColumnType("enum('cho','da_thanh_toan','that_bai')").HasColumnName("trang_thai");
            entity.HasOne(d => d.MaDonHangNavigation).WithMany(p => p.ThanhToans).HasForeignKey(d => d.MaDonHang).HasConstraintName("thanh_toan_ibfk_1");
        });

        modelBuilder.Entity<ThoiTiet>(entity =>
        {
            entity.HasKey(e => e.MaThoiTiet).HasName("PRIMARY");
            entity.ToTable("thoi_tiet");
            entity.Property(e => e.MaThoiTiet).HasColumnType("int(11)").HasColumnName("ma_thoi_tiet");
            entity.Property(e => e.Loai).HasColumnType("enum('nong','lanh','mua')").HasColumnName("loai");
            entity.Property(e => e.NhietDo).HasColumnName("nhiet_do");
            entity.Property(e => e.ThoiGian).HasDefaultValueSql("current_timestamp()").HasColumnType("datetime").HasColumnName("thoi_gian");
        });

        modelBuilder.Entity<ThongBao>(entity =>
        {
            entity.HasKey(e => e.MaThongBao).HasName("PRIMARY");
            entity.ToTable("thong_bao");
            entity.HasIndex(e => e.MaNguoiDung, "ma_nguoi_dung");
            entity.Property(e => e.MaThongBao).HasColumnType("int(11)").HasColumnName("ma_thong_bao");
            entity.Property(e => e.DaDoc).HasDefaultValueSql("'0'").HasColumnName("da_doc");
            entity.Property(e => e.MaNguoiDung).HasColumnType("int(11)").HasColumnName("ma_nguoi_dung");
            entity.Property(e => e.NgayTao).HasDefaultValueSql("current_timestamp()").HasColumnType("datetime").HasColumnName("ngay_tao");
            entity.Property(e => e.NoiDung).HasColumnType("text").HasColumnName("noi_dung");
            entity.HasOne(d => d.MaNguoiDungNavigation).WithMany(p => p.ThongBaos).HasForeignKey(d => d.MaNguoiDung).HasConstraintName("thong_bao_ibfk_1");
        });

        modelBuilder.Entity<VaiTro>(entity =>
        {
            entity.HasKey(e => e.MaVaiTro).HasName("PRIMARY");
            entity.ToTable("vai_tro");
            entity.Property(e => e.MaVaiTro).HasColumnType("int(11)").HasColumnName("ma_vai_tro");
            entity.Property(e => e.NgayTao).HasDefaultValueSql("current_timestamp()").HasColumnType("datetime").HasColumnName("ngay_tao");
            entity.Property(e => e.TenVaiTro).HasMaxLength(50).HasColumnName("ten_vai_tro");
            entity.HasMany(d => d.MaQuyens).WithMany(p => p.MaVaiTros)
                .UsingEntity<Dictionary<string, object>>(
                    "VaiTroQuyen",
                    r => r.HasOne<Quyen>().WithMany().HasForeignKey("MaQuyen").OnDelete(DeleteBehavior.ClientSetNull).HasConstraintName("vai_tro_quyen_ibfk_2"),
                    l => l.HasOne<VaiTro>().WithMany().HasForeignKey("MaVaiTro").OnDelete(DeleteBehavior.ClientSetNull).HasConstraintName("vai_tro_quyen_ibfk_1"),
                    j =>
                    {
                        j.HasKey("MaVaiTro", "MaQuyen").HasName("PRIMARY").HasAnnotation("MySql:IndexPrefixLength", new[] { 0, 0 });
                        j.ToTable("vai_tro_quyen");
                        j.HasIndex(new[] { "MaQuyen" }, "ma_quyen");
                        j.IndexerProperty<int>("MaVaiTro").HasColumnType("int(11)").HasColumnName("ma_vai_tro");
                        j.IndexerProperty<int>("MaQuyen").HasColumnType("int(11)").HasColumnName("ma_quyen");
                    });
        });

        modelBuilder.Entity<YeuThich>(entity =>
        {
            entity.HasKey(e => e.MaYeuThich).HasName("PRIMARY");
            entity.ToTable("yeu_thich");
            entity.HasIndex(e => e.MaMon, "ma_mon");
            entity.HasIndex(e => e.MaNguoiDung, "ma_nguoi_dung");
            entity.Property(e => e.MaYeuThich).HasColumnType("int(11)").HasColumnName("ma_yeu_thich");
            entity.Property(e => e.MaMon).HasColumnType("int(11)").HasColumnName("ma_mon");
            entity.Property(e => e.MaNguoiDung).HasColumnType("int(11)").HasColumnName("ma_nguoi_dung");
            entity.Property(e => e.NgayTao).HasDefaultValueSql("current_timestamp()").HasColumnType("datetime").HasColumnName("ngay_tao");
            entity.HasOne(d => d.MaMonNavigation).WithMany(p => p.YeuThiches).HasForeignKey(d => d.MaMon).HasConstraintName("yeu_thich_ibfk_2");
            entity.HasOne(d => d.MaNguoiDungNavigation).WithMany(p => p.YeuThiches).HasForeignKey(d => d.MaNguoiDung).HasConstraintName("yeu_thich_ibfk_1");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}