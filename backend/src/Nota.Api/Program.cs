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
else
{
    // На сервере миграции некому накатить руками, поэтому их применяет старт.
    // В разработке базу обновляет `dotnet ef database update`, а тесты — фабрика.
    using var scope = app.Services.CreateScope();
    scope.ServiceProvider.GetRequiredService<NotaDbContext>().Database.Migrate();
}

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
app.MapTaskEndpoints();
app.MapProjectEndpoints();

app.Run();

public partial class Program;
