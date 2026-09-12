using System.Net;
using Nota.Api.Domain;

namespace Nota.Api.Tests;

[Collection(nameof(ApiCollection))]
public class DeleteProjectTests(NotaApiFactory factory)
{
    [Fact]
    public async Task Deletes_project()
    {
        await factory.ResetAsync();
        var project = NewProject("Дом");
        await factory.SeedAsync(project);

        var client = factory.CreateClient();

        var response = await client.DeleteAsync($"/api/projects/{project.Id}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Empty(await factory.GetProjectsAsync());
    }

    [Fact]
    public async Task Deletes_tasks_of_the_project_and_keeps_the_rest()
    {
        await factory.ResetAsync();
        var project = NewProject("Дом");
        var other = NewProject("Работа");
        await factory.SeedAsync(project, other);
        await factory.SeedAsync(
            NewTask("Полить цветы", project.Id),
            NewTask("Сдать отчёт", other.Id),
            NewTask("Без проекта", null));

        var client = factory.CreateClient();

        var response = await client.DeleteAsync($"/api/projects/{project.Id}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        var tasks = await factory.GetTasksAsync();
        // Порядок чтения из базы не задан, поэтому сравниваются отсортированные имена.
        Assert.Equal(["Без проекта", "Сдать отчёт"], tasks.Select(t => t.Title).Order());
    }

    [Fact]
    public async Task Returns_not_found_for_unknown_project()
    {
        await factory.ResetAsync();

        var client = factory.CreateClient();

        var response = await client.DeleteAsync($"/api/projects/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    private static Project NewProject(string name) => new()
    {
        Id = Guid.NewGuid(),
        Name = name,
        CreatedAt = DateTimeOffset.UtcNow
    };

    private static TodoTask NewTask(string title, Guid? projectId) => new()
    {
        Id = Guid.NewGuid(),
        Title = title,
        IsDone = false,
        CreatedAt = DateTimeOffset.UtcNow,
        ProjectId = projectId
    };
}
