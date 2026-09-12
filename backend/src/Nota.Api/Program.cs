using Microsoft.EntityFrameworkCore;
using Nota.Api.Data;
using Nota.Api.Endpoints;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddDbContext<NotaDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Nota")));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
app.MapTaskEndpoints();

app.Run();

public partial class Program;
