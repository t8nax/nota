using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Todolist.Api.Data;
using Todolist.Api.Domain;

namespace Todolist.Api.Tests;

public class TodolistApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private const string TestConnectionString =
        "Host=localhost;Port=5434;Database=todolist_test;Username=todolist;Password=todolist_dev";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");

        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<TodolistDbContext>>();
            services.RemoveAll<TodolistDbContext>();
            services.AddDbContext<TodolistDbContext>(options => options.UseNpgsql(TestConnectionString));
        });
    }

    async Task IAsyncLifetime.InitializeAsync()
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<TodolistDbContext>();
        await db.Database.EnsureDeletedAsync();
        await db.Database.MigrateAsync();
    }

    async Task IAsyncLifetime.DisposeAsync()
    {
        using (var scope = Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<TodolistDbContext>();
            await db.Database.EnsureDeletedAsync();
        }

        await base.DisposeAsync();
    }

    /// <summary>Очищает таблицу задач, чтобы тест начинался с известного состояния.</summary>
    public async Task ResetAsync()
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<TodolistDbContext>();
        await db.Tasks.ExecuteDeleteAsync();
    }

    public async Task SeedAsync(params TodoTask[] tasks)
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<TodolistDbContext>();
        db.Tasks.AddRange(tasks);
        await db.SaveChangesAsync();
    }
}
