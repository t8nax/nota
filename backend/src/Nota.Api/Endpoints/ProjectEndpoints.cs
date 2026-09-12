using Microsoft.EntityFrameworkCore;
using Nota.Api.Contracts;
using Nota.Api.Data;
using Nota.Api.Domain;

namespace Nota.Api.Endpoints;

public static class ProjectEndpoints
{
    public static void MapProjectEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/api/projects");

        group.MapGet("/", async (NotaDbContext db, CancellationToken ct) =>
        {
            // Порядок левой колонки — порядок заведения проектов: ручной перестановки
            // в интерфейсе нет, а алфавит переставлял бы список при переименовании.
            var projects = await db.Projects
                .OrderBy(p => p.CreatedAt)
                .Select(p => new ProjectResponse(p.Id, p.Name, p.CreatedAt))
                .ToListAsync(ct);

            return Results.Ok(projects);
        })
        .WithName("GetProjects");

        group.MapPost("/", async (CreateProjectRequest request, NotaDbContext db, CancellationToken ct) =>
        {
            if (Validate(request.Name) is { } problem)
            {
                return problem;
            }

            var project = new Project
            {
                Id = Guid.NewGuid(),
                Name = request.Name!.Trim(),
                CreatedAt = DateTimeOffset.UtcNow
            };

            db.Projects.Add(project);
            await db.SaveChangesAsync(ct);

            // Location не отдаётся по той же причине, что и у задач: получения одного
            // проекта по идентификатору в API нет.
            return Results.Created(string.Empty, ToResponse(project));
        })
        .WithName("CreateProject");

        group.MapPatch("/{id:guid}", async (Guid id, UpdateProjectRequest request, NotaDbContext db, CancellationToken ct) =>
        {
            if (Validate(request.Name) is { } problem)
            {
                return problem;
            }

            var project = await db.Projects.FirstOrDefaultAsync(p => p.Id == id, ct);

            if (project is null)
            {
                return Results.NotFound();
            }

            project.Name = request.Name!.Trim();
            await db.SaveChangesAsync(ct);

            return Results.Ok(ToResponse(project));
        })
        .WithName("UpdateProject");

        group.MapDelete("/{id:guid}", async (Guid id, NotaDbContext db, CancellationToken ct) =>
        {
            var project = await db.Projects.FirstOrDefaultAsync(p => p.Id == id, ct);

            if (project is null)
            {
                return Results.NotFound();
            }

            // Задачи проекта уходят вместе с ним: их удаляет каскад в базе.
            db.Projects.Remove(project);
            await db.SaveChangesAsync(ct);

            return Results.NoContent();
        })
        .WithName("DeleteProject");
    }

    /// <summary>Отказ, если имя не годится, иначе null. Правила одни у создания и переименования.</summary>
    private static IResult? Validate(string? name)
    {
        var trimmed = name?.Trim() ?? string.Empty;

        if (trimmed.Length == 0)
        {
            return Results.ValidationProblem(new Dictionary<string, string[]>
            {
                ["name"] = ["Название проекта не может быть пустым."]
            });
        }

        if (trimmed.Length > Project.NameMaxLength)
        {
            return Results.ValidationProblem(new Dictionary<string, string[]>
            {
                ["name"] = [$"Название проекта не может быть длиннее {Project.NameMaxLength} символов."]
            });
        }

        return null;
    }

    private static ProjectResponse ToResponse(Project project) =>
        new(project.Id, project.Name, project.CreatedAt);
}
