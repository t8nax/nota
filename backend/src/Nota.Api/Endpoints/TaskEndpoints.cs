using Microsoft.EntityFrameworkCore;
using Nota.Api.Contracts;
using Nota.Api.Data;
using Nota.Api.Domain;

namespace Nota.Api.Endpoints;

public static class TaskEndpoints
{
    public static void MapTaskEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/api/tasks");

        group.MapGet("/", async (NotaDbContext db, CancellationToken ct) =>
        {
            // Порядок ленты: сначала по сроку, задачи без срока — в хвосте; внутри дня
            // задача на день целиком идёт перед задачами с временем.
            var tasks = await db.Tasks
                .OrderBy(t => t.DueDate.HasValue ? 0 : 1)
                .ThenBy(t => t.DueDate)
                .ThenBy(t => t.DueTime.HasValue ? 1 : 0)
                .ThenBy(t => t.DueTime)
                .ThenByDescending(t => t.CreatedAt)
                .Select(t => new TaskResponse(t.Id, t.Title, t.IsDone, t.CreatedAt, t.ProjectId, t.DueDate, t.DueTime))
                .ToListAsync(ct);

            return Results.Ok(tasks);
        })
        .WithName("GetTasks");

        group.MapPost("/", async (CreateTaskRequest request, NotaDbContext db, CancellationToken ct) =>
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

            if (request.DueDate is null && request.DueTime is not null)
            {
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["dueTime"] = [TimeWithoutDateMessage]
                });
            }

            if (await MissingProjectAsync(request.ProjectId, db, ct) is { } unknownProject)
            {
                return unknownProject;
            }

            var task = new TodoTask
            {
                Id = Guid.NewGuid(),
                Title = title,
                IsDone = false,
                CreatedAt = DateTimeOffset.UtcNow,
                ProjectId = request.ProjectId,
                DueDate = request.DueDate,
                DueTime = request.DueTime
            };

            db.Tasks.Add(task);
            await db.SaveChangesAsync(ct);

            // Location не отдаётся: получения одной задачи по идентификатору в API пока нет,
            // и ссылаться на несуществующий адрес честнее не начинать.
            return Results.Created(string.Empty, ToResponse(task));
        })
        .WithName("CreateTask");

        group.MapPatch("/{id:guid}", async (Guid id, UpdateTaskRequest request, NotaDbContext db, CancellationToken ct) =>
        {
            if (!request.IsDone.IsSet && !request.DueDate.IsSet && !request.DueTime.IsSet && !request.ProjectId.IsSet)
            {
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["request"] = ["Нужно передать хотя бы одно изменяемое поле."]
                });
            }

            if (request.IsDone is { IsSet: true, Value: null })
            {
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["isDone"] = ["Нужно передать значение отметки."]
                });
            }

            var task = await db.Tasks.FirstOrDefaultAsync(t => t.Id == id, ct);

            if (task is null)
            {
                return Results.NotFound();
            }

            var dueDate = request.DueDate.Or(task.DueDate);
            var dueTime = request.DueTime.Or(task.DueTime);

            // Снятие даты снимает и время: времени без дня не бывает. Время, заданное
            // в этом же запросе без даты, — уже ошибка запроса, а не умолчание.
            if (dueDate is null && !request.DueTime.IsSet)
            {
                dueTime = null;
            }

            if (dueDate is null && dueTime is not null)
            {
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["dueTime"] = [TimeWithoutDateMessage]
                });
            }

            if (request.ProjectId.IsSet)
            {
                if (await MissingProjectAsync(request.ProjectId.Value, db, ct) is { } unknownProject)
                {
                    return unknownProject;
                }

                task.ProjectId = request.ProjectId.Value;
            }

            if (request.IsDone.Value is bool isDone)
            {
                task.IsDone = isDone;
            }

            task.DueDate = dueDate;
            task.DueTime = dueTime;

            await db.SaveChangesAsync(ct);

            return Results.Ok(ToResponse(task));
        })
        .WithName("UpdateTask");
    }

    private const string TimeWithoutDateMessage = "Время срока нельзя задать без даты.";

    /// <summary>
    /// Отказ, если проект назван, но такого нет, иначе null. Без этой проверки запрос
    /// упирался бы во внешний ключ базы и возвращал 500 вместо внятного отказа.
    /// </summary>
    private static async Task<IResult?> MissingProjectAsync(Guid? projectId, NotaDbContext db, CancellationToken ct)
    {
        if (projectId is not { } id || await db.Projects.AnyAsync(p => p.Id == id, ct))
        {
            return null;
        }

        return Results.ValidationProblem(new Dictionary<string, string[]>
        {
            ["projectId"] = ["Такого проекта нет."]
        });
    }

    private static TaskResponse ToResponse(TodoTask task) =>
        new(task.Id, task.Title, task.IsDone, task.CreatedAt, task.ProjectId, task.DueDate, task.DueTime);
}
