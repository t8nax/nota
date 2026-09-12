using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Nota.Api.Data;
using Nota.Api.Domain;

namespace Nota.Api.Tests;

public class NotaApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private const string TestConnectionString =
        "Host=localhost;Port=5434;Database=nota_test;Username=nota;Password=nota_dev";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");

        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<NotaDbContext>>();
            services.RemoveAll<NotaDbContext>();
            services.AddDbContext<NotaDbContext>(options => options.UseNpgsql(TestConnectionString));
        });
    }

    async Task IAsyncLifetime.InitializeAsync()
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<NotaDbContext>();
        await db.Database.EnsureDeletedAsync();
        await db.Database.MigrateAsync();
    }

    async Task IAsyncLifetime.DisposeAsync()
    {
        using (var scope = Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<NotaDbContext>();
            await db.Database.EnsureDeletedAsync();
        }

        await base.DisposeAsync();
    }

    /// <summary>Очищает таблицы, чтобы тест начинался с известного состояния.</summary>
    public async Task ResetAsync()
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<NotaDbContext>();
        await db.Tasks.ExecuteDeleteAsync();
        await db.Projects.ExecuteDeleteAsync();
    }

    /// <summary>Читает задачи прямо из базы, минуя API.</summary>
    public async Task<List<TodoTask>> GetTasksAsync()
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<NotaDbContext>();
        return await db.Tasks.AsNoTracking().ToListAsync();
    }

    public async Task SeedAsync(params TodoTask[] tasks)
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<NotaDbContext>();
        db.Tasks.AddRange(tasks);
        await db.SaveChangesAsync();
    }

    /// <summary>Читает проекты прямо из базы, минуя API.</summary>
    public async Task<List<Project>> GetProjectsAsync()
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<NotaDbContext>();
        return await db.Projects.AsNoTracking().ToListAsync();
    }

    public async Task SeedAsync(params Project[] projects)
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<NotaDbContext>();
        db.Projects.AddRange(projects);
        await db.SaveChangesAsync();
    }
}
