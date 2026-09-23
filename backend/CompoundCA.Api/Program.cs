using System.Globalization;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using CompoundCA.Api.Services;
using Microsoft.AspNetCore.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.ConfigureKestrel(options => options.Limits.MaxRequestBodySize = 16 * 1024);
builder.Services.AddControllers().AddJsonOptions(options =>
    options.JsonSerializerOptions.NumberHandling = JsonNumberHandling.Strict);
builder.Services.AddProblemDetails();
builder.Services.AddSingleton<ProjectionService>();
builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
{
    var origins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
    if (origins.Length > 0)
    {
        policy.WithOrigins(origins).WithMethods("GET", "POST").WithHeaders("Content-Type");
    }
}));
builder.Services.AddRateLimiter(options =>
{
    // Shared by calculator requests on this API instance; health checks are exempt.
    options.AddFixedWindowLimiter("calculator", limiter =>
    {
        limiter.PermitLimit = 120;
        limiter.Window = TimeSpan.FromMinutes(1);
        limiter.QueueLimit = 0;
        limiter.AutoReplenishment = true;
    });
    options.OnRejected = async (context, cancellationToken) =>
    {
        if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
        {
            context.HttpContext.Response.Headers.RetryAfter =
                Math.Ceiling(retryAfter.TotalSeconds).ToString(CultureInfo.InvariantCulture);
        }
        await Results.Problem(statusCode: StatusCodes.Status429TooManyRequests,
            title: "Too many requests", detail: "Please wait a minute before calculating again.")
            .ExecuteAsync(context.HttpContext);
    };
});

var app = builder.Build();

app.UseExceptionHandler();
app.UseStatusCodePages();
app.UseRouting();
app.UseCors();
app.UseRateLimiter();
app.MapGet("/api/health", () => Results.Ok(new { status = "healthy" }));
app.MapControllers().RequireRateLimiting("calculator");

app.Run();
