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
            // Порядок ленты: сначала по сроку, задачи без срока — в хвосте; внутри дня
            // задача на день целиком идёт перед задачами с временем.
            var tasks = await db.Tasks
                .OrderBy(t => t.DueDate.HasValue ? 0 : 1)
                .ThenBy(t => t.DueDate)
                .ThenBy(t => t.DueTime.HasValue ? 1 : 0)
                .ThenBy(t => t.DueTime)
                .ThenByDescending(t => t.CreatedAt)
                .Select(t => new TaskResponse(t.Id, t.Title, t.IsDone, t.CreatedAt, t.DueDate, t.DueTime))
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

            if (request.DueDate is null && request.DueTime is not null)
            {
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["dueTime"] = [TimeWithoutDateMessage]
                });
            }

            var task = new TodoTask
            {
                Id = Guid.NewGuid(),
                Title = title,
                IsDone = false,
                CreatedAt = DateTimeOffset.UtcNow,
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

        group.MapPatch("/{id:guid}", async (Guid id, UpdateTaskRequest request, TodolistDbContext db, CancellationToken ct) =>
        {
            if (!request.IsDone.IsSet && !request.DueDate.IsSet && !request.DueTime.IsSet)
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

    private static TaskResponse ToResponse(TodoTask task) =>
        new(task.Id, task.Title, task.IsDone, task.CreatedAt, task.DueDate, task.DueTime);
}
