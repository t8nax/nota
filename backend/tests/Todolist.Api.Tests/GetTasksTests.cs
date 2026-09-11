using System.Net;
using System.Net.Http.Json;
using Todolist.Api.Contracts;
using Todolist.Api.Domain;

namespace Todolist.Api.Tests;

[Collection(nameof(ApiCollection))]
public class GetTasksTests(TodolistApiFactory factory)
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
}
