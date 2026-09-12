using System.Net;
using System.Net.Http.Json;
using Nota.Api.Contracts;
using Nota.Api.Domain;

namespace Nota.Api.Tests;

[Collection(nameof(ApiCollection))]
public class CreateProjectTests(NotaApiFactory factory)
{
    [Fact]
    public async Task Creates_project_and_returns_it()
    {
        await factory.ResetAsync();

        var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/projects", new CreateProjectRequest("  Дом  "));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var created = await response.Content.ReadFromJsonAsync<ProjectResponse>();
        Assert.NotNull(created);
        Assert.Equal("Дом", created.Name);
        Assert.NotEqual(Guid.Empty, created.Id);

        var stored = Assert.Single(await factory.GetProjectsAsync());
        Assert.Equal(created.Id, stored.Id);
        Assert.Equal("Дом", stored.Name);
    }

    [Fact]
    public async Task Created_project_appears_in_list()
    {
        await factory.ResetAsync();

        var client = factory.CreateClient();

        await client.PostAsJsonAsync("/api/projects", new CreateProjectRequest("Работа"));

        var projects = await client.GetFromJsonAsync<List<ProjectResponse>>("/api/projects");

        Assert.NotNull(projects);
        Assert.Equal("Работа", Assert.Single(projects).Name);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Rejects_blank_name(string? name)
    {
        await factory.ResetAsync();

        var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/projects", new CreateProjectRequest(name));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Empty(await factory.GetProjectsAsync());
    }

    [Fact]
    public async Task Rejects_name_longer_than_limit()
    {
        await factory.ResetAsync();

        var client = factory.CreateClient();
        var tooLong = new string('я', Project.NameMaxLength + 1);

        var response = await client.PostAsJsonAsync("/api/projects", new CreateProjectRequest(tooLong));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Empty(await factory.GetProjectsAsync());
    }

    [Fact]
    public async Task Accepts_name_at_the_limit()
    {
        await factory.ResetAsync();

        var client = factory.CreateClient();
        var atLimit = new string('я', Project.NameMaxLength);

        var response = await client.PostAsJsonAsync("/api/projects", new CreateProjectRequest(atLimit));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Single(await factory.GetProjectsAsync());
    }
}
