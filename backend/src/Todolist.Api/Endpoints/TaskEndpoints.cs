using Microsoft.EntityFrameworkCore;
using Todolist.Api.Contracts;
using Todolist.Api.Data;

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
    }
}
