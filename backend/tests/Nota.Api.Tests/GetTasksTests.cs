using System.Net;
using System.Net.Http.Json;
using Nota.Api.Contracts;
using Nota.Api.Domain;

namespace Nota.Api.Tests;

[Collection(nameof(ApiCollection))]
public class GetTasksTests(NotaApiFactory factory)
{
    [Fact]
    public async Task Returns_empty_list_when_no_tasks()
    {
        await factory.ResetAsync();

        var client = factory.CreateClient();

        var response = await client.GetAsync("/api/tasks");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var tasks = await response.Content.ReadFromJsonAsync<List<TaskResponse>>();
        Assert.NotNull(tasks);
        Assert.Empty(tasks);
    }

    [Fact]
    public async Task Returns_tasks_stored_in_database()
    {
        await factory.ResetAsync();
        await factory.SeedAsync(new TodoTask
        {
            Id = Guid.NewGuid(),
            Title = "Купить молоко",
            IsDone = false,
            CreatedAt = DateTimeOffset.UtcNow
        });

        var client = factory.CreateClient();

        var response = await client.GetAsync("/api/tasks");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var tasks = await response.Content.ReadFromJsonAsync<List<TaskResponse>>();
        Assert.NotNull(tasks);
        var task = Assert.Single(tasks);
        Assert.Equal("Купить молоко", task.Title);
        Assert.False(task.IsDone);
    }

    [Fact]
    public async Task Orders_by_due_date_putting_undated_tasks_last()
    {
        await factory.ResetAsync();

        var day = new DateOnly(2026, 9, 20);

        // Порядок в базе нарочно обратный ожидаемому, чтобы проверялась сортировка,
        // а не совпадение с порядком вставки.
        await factory.SeedAsync(
            Task_("Без срока"),
            Task_("Позже в тот же день", day, new TimeOnly(18, 0)),
            Task_("Раньше в тот же день", day, new TimeOnly(9, 0)),
            Task_("Весь день", day),
            Task_("Накануне", day.AddDays(-1)));

        var client = factory.CreateClient();

        var tasks = await client.GetFromJsonAsync<List<TaskResponse>>("/api/tasks");

        Assert.NotNull(tasks);
        Assert.Equal(
            ["Накануне", "Весь день", "Раньше в тот же день", "Позже в тот же день", "Без срока"],
            tasks.Select(t => t.Title));
    }

    private static TodoTask Task_(string title, DateOnly? dueDate = null, TimeOnly? dueTime = null) => new()
    {
        Id = Guid.NewGuid(),
        Title = title,
        IsDone = false,
        CreatedAt = DateTimeOffset.UtcNow,
        DueDate = dueDate,
        DueTime = dueTime
    };
}
