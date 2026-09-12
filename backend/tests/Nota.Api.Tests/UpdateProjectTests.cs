using System.Net;
using System.Net.Http.Json;
using Nota.Api.Contracts;
using Nota.Api.Domain;

namespace Nota.Api.Tests;

[Collection(nameof(ApiCollection))]
public class UpdateProjectTests(NotaApiFactory factory)
{
    [Fact]
    public async Task Renames_project()
    {
        await factory.ResetAsync();
        var project = NewProject("Дом");
        await factory.SeedAsync(project);

        var client = factory.CreateClient();

        var response = await client.PatchAsJsonAsync(
            $"/api/projects/{project.Id}",
            new UpdateProjectRequest("  Дача  "));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var updated = await response.Content.ReadFromJsonAsync<ProjectResponse>();
        Assert.NotNull(updated);
        Assert.Equal(project.Id, updated.Id);
        Assert.Equal("Дача", updated.Name);

        var stored = Assert.Single(await factory.GetProjectsAsync());
        Assert.Equal("Дача", stored.Name);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Rejects_blank_name(string? name)
    {
        await factory.ResetAsync();
        var project = NewProject("Дом");
        await factory.SeedAsync(project);

        var client = factory.CreateClient();

        var response = await client.PatchAsJsonAsync(
            $"/api/projects/{project.Id}",
            new UpdateProjectRequest(name));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("Дом", Assert.Single(await factory.GetProjectsAsync()).Name);
    }

    [Fact]
    public async Task Returns_not_found_for_unknown_project()
    {
        await factory.ResetAsync();

        var client = factory.CreateClient();

        var response = await client.PatchAsJsonAsync(
            $"/api/projects/{Guid.NewGuid()}",
            new UpdateProjectRequest("Дача"));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    private static Project NewProject(string name) => new()
    {
        Id = Guid.NewGuid(),
        Name = name,
        CreatedAt = DateTimeOffset.UtcNow
    };
}
