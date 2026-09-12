using System.Net;
using System.Net.Http.Json;
using Nota.Api.Contracts;
using Nota.Api.Domain;

namespace Nota.Api.Tests;

[Collection(nameof(ApiCollection))]
public class GetProjectsTests(NotaApiFactory factory)
{
    [Fact]
    public async Task Returns_empty_list_when_no_projects()
    {
        await factory.ResetAsync();

        var client = factory.CreateClient();

        var response = await client.GetAsync("/api/projects");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var projects = await response.Content.ReadFromJsonAsync<List<ProjectResponse>>();
        Assert.NotNull(projects);
        Assert.Empty(projects);
    }

    [Fact]
    public async Task Orders_projects_by_creation_time()
    {
        await factory.ResetAsync();

        var now = DateTimeOffset.UtcNow;

        // Порядок вставки обратный ожидаемому: проверяется сортировка, а не совпадение
        // с тем, как строки легли в таблицу.
        await factory.SeedAsync(
            NewProject("Заведён последним", now),
            NewProject("Заведён первым", now.AddHours(-2)),
            NewProject("Заведён вторым", now.AddHours(-1)));

        var client = factory.CreateClient();

        var projects = await client.GetFromJsonAsync<List<ProjectResponse>>("/api/projects");

        Assert.NotNull(projects);
        Assert.Equal(
            ["Заведён первым", "Заведён вторым", "Заведён последним"],
            projects.Select(p => p.Name));
    }

    private static Project NewProject(string name, DateTimeOffset createdAt) => new()
    {
        Id = Guid.NewGuid(),
        Name = name,
        CreatedAt = createdAt
    };
}
