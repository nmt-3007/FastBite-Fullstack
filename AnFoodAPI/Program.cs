using AnFoodAPI.Services;
using AnFoodAPI.Models;
using Microsoft.EntityFrameworkCore;
// 👇 CÁC THƯ VIỆN BẮT BUỘC CHO JWT & SWAGGER
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

// ==========================================
// 1. CẤU HÌNH DATABASE (MySQL)
// ==========================================
// Lưu ý: Đảm bảo XAMPP/MySQL đã bật
var connectionString = "server=localhost;database=anshop_db;user=root;password=";
builder.Services.AddDbContext<AnshopDbContext>(options =>
    options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));

// ==========================================
// 2. CẤU HÌNH DỊCH VỤ (SERVICES)
// ==========================================
// Đăng ký VNPay
builder.Services.AddScoped<IVnPayService, VnPayService>();

// ==========================================
// 3. CẤU HÌNH JWT AUTHENTICATION (QUAN TRỌNG NHẤT)
// ==========================================
// ⚠️ Key này PHẢI KHỚP Y HỆT bên NguoiDungController.cs
var secretKey = "DAY_LA_KEY_BI_MAT_CUA_FASTBITE_123456789"; 
var keyBytes = Encoding.ASCII.GetBytes(secretKey);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false; // Tắt yêu cầu HTTPS khi chạy Local
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(keyBytes),
        ValidateIssuer = false, // Bỏ qua check Issuer (để dễ chạy local)
        ValidateAudience = false, // Bỏ qua check Audience
        ClockSkew = TimeSpan.Zero // Chặn lệch giờ
    };
});

// ==========================================
// 4. CẤU HÌNH CORS (CHO PHÉP REACT)
// ==========================================
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReact", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173") // Thêm các domain React
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials(); // Quan trọng: Cho phép gửi kèm token/cookie
    });
});

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Fix lỗi vòng lặp dữ liệu (Circular Reference) khi query EF Core
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    });

// ==========================================
// 5. CẤU HÌNH SWAGGER (CÓ NÚT KHÓA ĐỂ TEST TOKEN)
// ==========================================
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "AnFoodAPI", Version = "v1" });

    // Định nghĩa bảo mật Bearer cho Swagger
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "Nhập token vào đây theo dạng: Bearer {token}",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            new string[] { }
        }
    });
});

// ==========================================
// 6. KHỞI CHẠY APP
// ==========================================
var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// app.UseHttpsRedirection(); // Có thể comment dòng này nếu chạy localhost bị lỗi SSL
app.UseStaticFiles();

// Kích hoạt CORS
app.UseCors("AllowReact");

// 👇 THỨ TỰ HAI DÒNG NÀY CỰC KỲ QUAN TRỌNG 👇
app.UseAuthentication(); // 1. Kiểm tra vé (Token) -> Phải đứng trước
app.UseAuthorization();  // 2. Cho vào cửa

app.MapControllers();

app.Run();