using System.Net;
using Nota.Api.Domain;

namespace Nota.Api.Tests;

[Collection(nameof(ApiCollection))]
public class DeleteTaskTests(NotaApiFactory factory)
{
    [Fact]
    public async Task Deletes_task_and_keeps_the_rest()
    {
        await factory.ResetAsync();
        var target = NewTask("Купить хлеб");
        var other = NewTask("Позвонить врачу");
        await factory.SeedAsync(target, other);

        var client = factory.CreateClient();

        var response = await client.DeleteAsync($"/api/tasks/{target.Id}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(other.Id, Assert.Single(await factory.GetTasksAsync()).Id);
    }

    [Fact]
    public async Task Returns_not_found_for_unknown_task()
    {
        await factory.ResetAsync();

        var client = factory.CreateClient();

        var response = await client.DeleteAsync($"/api/tasks/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    private static TodoTask NewTask(string title) => new()
    {
        Id = Guid.NewGuid(),
        Title = title,
        IsDone = false,
        CreatedAt = DateTimeOffset.UtcNow
    };
}
