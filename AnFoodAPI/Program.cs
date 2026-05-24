using AnFoodAPI.Services; 
using AnFoodAPI.Models;     
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

// ==========================================
// 1. CẤU HÌNH DATABASE (ÉP NHẬN RAILWAY)
// ==========================================
// 👉 ĐÃ FIX: Bắt buộc C# tìm biến 'DB_CONNECTION' trên Railway trước, nếu không có mới dùng localhost ở nhà
var connectionString = Environment.GetEnvironmentVariable("DB_CONNECTION") 
                       ?? builder.Configuration.GetConnectionString("DefaultConnection");

builder.Services.AddDbContext<AnshopDbContext>(options =>
    options.UseMySql(
        connectionString, 
        ServerVersion.AutoDetect(connectionString)
    )
);

// ==========================================
// 2. CẤU HÌNH DỊCH VỤ (SERVICES)
// ==========================================
builder.Services.AddScoped<IVnPayService, VnPayService>();
builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.AddHttpClient();
builder.Services.AddScoped<IChatbotService, ChatbotService>();
builder.Services.AddSingleton<IRecommendationService, RecommendationService>();

// ==========================================
// 3. CẤU HÌNH JWT AUTHENTICATION
// ==========================================
var secretKey = "DAY_LA_KEY_BI_MAT_CUA_FASTBITE_123456789"; 
var keyBytes = Encoding.ASCII.GetBytes(secretKey);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false; 
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(keyBytes),
        ValidateIssuer = false, 
        ValidateAudience = false, 
        ClockSkew = TimeSpan.Zero 
    };
});

// ==========================================
// 4. CẤU HÌNH CORS (ĐÃ MỞ KHÓA CHO VERCEL)
// ==========================================
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReact", policy =>
    {
        // Cho phép MỌI domain (Vercel, Localhost) gọi vào mà không bị chặn
        policy.SetIsOriginAllowed(_ => true) 
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials(); 
    });
});

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    });

// ==========================================
// 5. CẤU HÌNH SWAGGER 
// ==========================================
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "AnFoodAPI", Version = "v1" });

    // DÒNG NÀY LÀ THẦN DƯỢC CHỮA LỖI TRẮNG MÀN HÌNH ĐÂY Ạ
    c.CustomSchemaIds(type => type.FullName);

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



builder.Services.AddHttpClient<IWeatherService, WeatherService>();
// Thêm đoạn này vào Program.cs
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowVercel",
        policy => policy.WithOrigins("https://fast-bite-fullstack.vercel.app") // Địa chỉ Vercel của sếp
                        .AllowAnyMethod()
                        .AllowAnyHeader());
});
// ==========================================
// 6. KHỞI CHẠY APP
// ==========================================
var app = builder.Build();

// ==========================================
// 🚀 TỰ ĐỘNG UPDATE DATABASE KHI CHẠY (CHUẨN PRODUCTION)
// ==========================================
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<AnshopDbContext>();
        // Lệnh này sẽ tự động kết nối vào MySQL trên Railway và tạo toàn bộ bảng!
        context.Database.Migrate(); 
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Lỗi nghiêm trọng khi tự động tạo Database: {Message}", ex.Message);
    }
}
// ==========================================

// Đã đưa Swagger ra ngoài if để khi Deploy lên mạng vẫn dùng được
app.UseSwagger();
app.UseSwaggerUI();

app.UseStaticFiles();

// Kích hoạt CORS
app.UseCors("AllowReact");
app.UseCors("AllowVercel");
app.UseAuthentication(); 
app.UseAuthorization();  

app.MapControllers();

app.Run();