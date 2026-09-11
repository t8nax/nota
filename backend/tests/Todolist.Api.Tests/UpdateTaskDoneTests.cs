using System.Net;
using System.Net.Http.Json;
using Todolist.Api.Contracts;
using Todolist.Api.Domain;

namespace Todolist.Api.Tests;

[Collection(nameof(ApiCollection))]
public class UpdateTaskDoneTests(TodolistApiFactory factory)
{
    private static TodoTask NewTask(string title, bool isDone) => new()
    {
        Id = Guid.NewGuid(),
        Title = title,
        IsDone = isDone,
        CreatedAt = DateTimeOffset.UtcNow
    };

    [Fact]
    public async Task Marks_task_done()
    {
        await factory.ResetAsync();
        var task = NewTask("Купить хлеб", isDone: false);
        await factory.SeedAsync(task);

        var client = factory.CreateClient();

        var response = await client.PatchAsJsonAsync($"/api/tasks/{task.Id}", new UpdateTaskDoneRequest(true));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var updated = await response.Content.ReadFromJsonAsync<TaskResponse>();
        Assert.NotNull(updated);
        Assert.Equal(task.Id, updated.Id);
        Assert.Equal("Купить хлеб", updated.Title);
        Assert.True(updated.IsDone);

        var stored = Assert.Single(await factory.GetTasksAsync());
        Assert.True(stored.IsDone);
    }

    [Fact]
    public async Task Marks_task_not_done()
    {
        await factory.ResetAsync();
        var task = NewTask("Полить цветы", isDone: true);
        await factory.SeedAsync(task);

        var client = factory.CreateClient();

        var response = await client.PatchAsJsonAsync($"/api/tasks/{task.Id}", new UpdateTaskDoneRequest(false));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var stored = Assert.Single(await factory.GetTasksAsync());
        Assert.False(stored.IsDone);
    }

    [Fact]
    public async Task Repeated_request_keeps_the_same_value()
    {
        await factory.ResetAsync();
        var task = NewTask("Помыть посуду", isDone: false);
        await factory.SeedAsync(task);

        var client = factory.CreateClient();

        await client.PatchAsJsonAsync($"/api/tasks/{task.Id}", new UpdateTaskDoneRequest(true));
        var response = await client.PatchAsJsonAsync($"/api/tasks/{task.Id}", new UpdateTaskDoneRequest(true));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var stored = Assert.Single(await factory.GetTasksAsync());
        Assert.True(stored.IsDone);
    }

    [Fact]
    public async Task Does_not_touch_other_tasks()
    {
        await factory.ResetAsync();
        var target = NewTask("Забрать посылку", isDone: false);
        var other = NewTask("Позвонить врачу", isDone: false);
        await factory.SeedAsync(target, other);

        var client = factory.CreateClient();

        await client.PatchAsJsonAsync($"/api/tasks/{target.Id}", new UpdateTaskDoneRequest(true));

        var stored = await factory.GetTasksAsync();
        Assert.True(stored.Single(t => t.Id == target.Id).IsDone);
        Assert.False(stored.Single(t => t.Id == other.Id).IsDone);
    }

    [Fact]
    public async Task Returns_not_found_for_unknown_id()
    {
        await factory.ResetAsync();

        var client = factory.CreateClient();

        var response = await client.PatchAsJsonAsync($"/api/tasks/{Guid.NewGuid()}", new UpdateTaskDoneRequest(true));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Rejects_request_without_value()
    {
        await factory.ResetAsync();
        var task = NewTask("Сдать отчёт", isDone: false);
        await factory.SeedAsync(task);

        var client = factory.CreateClient();

        var response = await client.PatchAsJsonAsync($"/api/tasks/{task.Id}", new UpdateTaskDoneRequest(null));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var stored = Assert.Single(await factory.GetTasksAsync());
        Assert.False(stored.IsDone);
    }
}
