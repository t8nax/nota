using Microsoft.EntityFrameworkCore;
using Todolist.Api.Contracts;
using Todolist.Api.Data;
using Todolist.Api.Domain;

namespace Todolist.Api.Endpoints;

public static class TaskEndpoints
{
    public static void MapTaskEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/api/tasks");

        group.MapGet("/", async (TodolistDbContext db, CancellationToken ct) =>
        {
            var tasks = await db.Tasks
                .OrderByDescending(t => t.CreatedAt)
                .Select(t => new TaskResponse(t.Id, t.Title, t.IsDone, t.CreatedAt))
                .ToListAsync(ct);

            return Results.Ok(tasks);
        })
        .WithName("GetTasks");

        group.MapPost("/", async (CreateTaskRequest request, TodolistDbContext db, CancellationToken ct) =>
        {
            var title = request.Title?.Trim() ?? string.Empty;

            if (title.Length == 0)
            {
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["title"] = ["Заголовок задачи не может быть пустым."]
                });
            }

            if (title.Length > TodoTask.TitleMaxLength)
            {
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["title"] = [$"Заголовок задачи не может быть длиннее {TodoTask.TitleMaxLength} символов."]
                });
            }

            var task = new TodoTask
            {
                Id = Guid.NewGuid(),
                Title = title,
                IsDone = false,
                CreatedAt = DateTimeOffset.UtcNow
            };

            db.Tasks.Add(task);
            await db.SaveChangesAsync(ct);

            var response = new TaskResponse(task.Id, task.Title, task.IsDone, task.CreatedAt);

            // Location не отдаётся: получения одной задачи по идентификатору в API пока нет,
            // и ссылаться на несуществующий адрес честнее не начинать.
            return Results.Created(string.Empty, response);
        })
        .WithName("CreateTask");
    }
}
