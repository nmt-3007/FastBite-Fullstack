using System;
using System.Collections.Generic;

namespace AnFoodAPI.Models;

public partial class YeuThich
{
    public int MaYeuThich { get; set; }

    public int? MaNguoiDung { get; set; }

    public int? MaMon { get; set; }

    public DateTime? NgayTao { get; set; }

    public virtual MonAn? MaMonNavigation { get; set; }

    public virtual NguoiDung? MaNguoiDungNavigation { get; set; }
}
