using System.Net;
using System.Net.Http.Json;
using Nota.Api.Contracts;
using Nota.Api.Domain;

namespace Nota.Api.Tests;

[Collection(nameof(ApiCollection))]
public class CreateTaskTests(NotaApiFactory factory)
{
    [Fact]
    public async Task Creates_task_and_returns_it()
    {
        await factory.ResetAsync();

        var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/tasks", new CreateTaskRequest("  Купить хлеб  "));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var created = await response.Content.ReadFromJsonAsync<TaskResponse>();
        Assert.NotNull(created);
        Assert.Equal("Купить хлеб", created.Title);
        Assert.False(created.IsDone);
        Assert.NotEqual(Guid.Empty, created.Id);

        var stored = Assert.Single(await factory.GetTasksAsync());
        Assert.Equal(created.Id, stored.Id);
        Assert.Equal("Купить хлеб", stored.Title);
    }

    [Fact]
    public async Task Created_task_appears_in_list()
    {
        await factory.ResetAsync();

        var client = factory.CreateClient();

        await client.PostAsJsonAsync("/api/tasks", new CreateTaskRequest("Полить цветы"));

        var tasks = await client.GetFromJsonAsync<List<TaskResponse>>("/api/tasks");

        Assert.NotNull(tasks);
        Assert.Equal("Полить цветы", Assert.Single(tasks).Title);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Rejects_blank_title(string? title)
    {
        await factory.ResetAsync();

        var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/tasks", new CreateTaskRequest(title));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Empty(await factory.GetTasksAsync());
    }

    [Fact]
    public async Task Rejects_title_longer_than_limit()
    {
        await factory.ResetAsync();

        var client = factory.CreateClient();
        var tooLong = new string('я', TodoTask.TitleMaxLength + 1);

        var response = await client.PostAsJsonAsync("/api/tasks", new CreateTaskRequest(tooLong));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Empty(await factory.GetTasksAsync());
    }

    [Fact]
    public async Task Accepts_title_at_the_limit()
    {
        await factory.ResetAsync();

        var client = factory.CreateClient();
        var atLimit = new string('я', TodoTask.TitleMaxLength);

        var response = await client.PostAsJsonAsync("/api/tasks", new CreateTaskRequest(atLimit));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Single(await factory.GetTasksAsync());
    }

    [Fact]
    public async Task Creates_task_without_due_date()
    {
        await factory.ResetAsync();

        var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/tasks", new CreateTaskRequest("Разобрать шкаф"));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var created = await response.Content.ReadFromJsonAsync<TaskResponse>();
        Assert.NotNull(created);
        Assert.Null(created.DueDate);
        Assert.Null(created.DueTime);
    }

    [Fact]
    public async Task Creates_task_with_due_date_only()
    {
        await factory.ResetAsync();

        var client = factory.CreateClient();
        var due = new DateOnly(2026, 9, 20);

        var response = await client.PostAsJsonAsync("/api/tasks", new CreateTaskRequest("Сдать анализы", due));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var created = await response.Content.ReadFromJsonAsync<TaskResponse>();
        Assert.NotNull(created);
        Assert.Equal(due, created.DueDate);
        Assert.Null(created.DueTime);

        var stored = Assert.Single(await factory.GetTasksAsync());
        Assert.Equal(due, stored.DueDate);
        Assert.Null(stored.DueTime);
    }

    [Fact]
    public async Task Creates_task_with_due_date_and_time()
    {
        await factory.ResetAsync();

        var client = factory.CreateClient();
        var due = new DateOnly(2026, 9, 20);
        var at = new TimeOnly(18, 0);

        var response = await client.PostAsJsonAsync("/api/tasks", new CreateTaskRequest("Позвонить маме", due, at));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var stored = Assert.Single(await factory.GetTasksAsync());
        Assert.Equal(due, stored.DueDate);
        Assert.Equal(at, stored.DueTime);
    }

    [Fact]
    public async Task Rejects_time_without_date()
    {
        await factory.ResetAsync();

        var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/tasks",
            new CreateTaskRequest("Забрать справку", DueTime: new TimeOnly(10, 0)));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Empty(await factory.GetTasksAsync());
    }
}
