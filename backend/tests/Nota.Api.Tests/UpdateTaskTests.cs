using System.Net;
using System.Net.Http.Json;
using System.Text;
using Nota.Api.Contracts;
using Nota.Api.Domain;

namespace Nota.Api.Tests;

[Collection(nameof(ApiCollection))]
public class UpdateTaskTests(NotaApiFactory factory)
{
    private static TodoTask NewTask(
        string title,
        bool isDone = false,
        DateOnly? dueDate = null,
        TimeOnly? dueTime = null) => new()
    {
        Id = Guid.NewGuid(),
        Title = title,
        IsDone = isDone,
        CreatedAt = DateTimeOffset.UtcNow,
        DueDate = dueDate,
        DueTime = dueTime
    };

    private static Project NewProject(string name) => new()
    {
        Id = Guid.NewGuid(),
        Name = name,
        CreatedAt = DateTimeOffset.UtcNow
    };

    /// <summary>
    /// Тело PATCH отправляется строкой, а не объектом: смысл запроса в том, какие поля
    /// в нём есть, и сериализация контракта это различие не передаёт.
    /// </summary>
    private Task<HttpResponseMessage> PatchAsync(Guid id, string json) =>
        factory.CreateClient().PatchAsync(
            $"/api/tasks/{id}",
            new StringContent(json, Encoding.UTF8, "application/json"));

    [Fact]
    public async Task Marks_task_done()
    {
        await factory.ResetAsync();
        var task = NewTask("Купить хлеб");
        await factory.SeedAsync(task);

        var response = await PatchAsync(task.Id, """{"isDone": true}""");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var updated = await response.Content.ReadFromJsonAsync<TaskResponse>();
        Assert.NotNull(updated);
        Assert.Equal(task.Id, updated.Id);
        Assert.Equal("Купить хлеб", updated.Title);
        Assert.True(updated.IsDone);

        var stored = Assert.Single(await factory.GetTasksAsync());
        Assert.True(stored.IsDone);
    }

    [Fact]
    public async Task Marks_task_not_done()
    {
        await factory.ResetAsync();
        var task = NewTask("Полить цветы", isDone: true);
        await factory.SeedAsync(task);

        var response = await PatchAsync(task.Id, """{"isDone": false}""");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var stored = Assert.Single(await factory.GetTasksAsync());
        Assert.False(stored.IsDone);
    }

    [Fact]
    public async Task Repeated_request_keeps_the_same_value()
    {
        await factory.ResetAsync();
        var task = NewTask("Помыть посуду");
        await factory.SeedAsync(task);

        await PatchAsync(task.Id, """{"isDone": true}""");
        var response = await PatchAsync(task.Id, """{"isDone": true}""");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var stored = Assert.Single(await factory.GetTasksAsync());
        Assert.True(stored.IsDone);
    }

    [Fact]
    public async Task Does_not_touch_other_tasks()
    {
        await factory.ResetAsync();
        var target = NewTask("Забрать посылку");
        var other = NewTask("Позвонить врачу");
        await factory.SeedAsync(target, other);

        await PatchAsync(target.Id, """{"isDone": true}""");

        var stored = await factory.GetTasksAsync();
        Assert.True(stored.Single(t => t.Id == target.Id).IsDone);
        Assert.False(stored.Single(t => t.Id == other.Id).IsDone);
    }

    [Fact]
    public async Task Returns_not_found_for_unknown_id()
    {
        await factory.ResetAsync();

        var response = await PatchAsync(Guid.NewGuid(), """{"isDone": true}""");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Rejects_empty_body()
    {
        await factory.ResetAsync();
        var task = NewTask("Сдать отчёт");
        await factory.SeedAsync(task);

        var response = await PatchAsync(task.Id, "{}");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var stored = Assert.Single(await factory.GetTasksAsync());
        Assert.False(stored.IsDone);
    }

    [Fact]
    public async Task Rejects_null_done_value()
    {
        await factory.ResetAsync();
        var task = NewTask("Сдать отчёт");
        await factory.SeedAsync(task);

        var response = await PatchAsync(task.Id, """{"isDone": null}""");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Sets_due_date_without_time()
    {
        await factory.ResetAsync();
        var task = NewTask("Сходить к врачу");
        await factory.SeedAsync(task);

        var response = await PatchAsync(task.Id, """{"dueDate": "2026-09-20"}""");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var stored = Assert.Single(await factory.GetTasksAsync());
        Assert.Equal(new DateOnly(2026, 9, 20), stored.DueDate);
        Assert.Null(stored.DueTime);
    }

    [Fact]
    public async Task Sets_due_date_with_time()
    {
        await factory.ResetAsync();
        var task = NewTask("Позвонить маме");
        await factory.SeedAsync(task);

        var response = await PatchAsync(task.Id, """{"dueDate": "2026-09-20", "dueTime": "18:00:00"}""");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var stored = Assert.Single(await factory.GetTasksAsync());
        Assert.Equal(new DateOnly(2026, 9, 20), stored.DueDate);
        Assert.Equal(new TimeOnly(18, 0), stored.DueTime);
    }

    [Fact]
    public async Task Accepts_time_without_seconds()
    {
        await factory.ResetAsync();
        var task = NewTask("Забрать заказ");
        await factory.SeedAsync(task);

        // Именно такую строку даёт поле ввода времени в браузере.
        var response = await PatchAsync(task.Id, """{"dueDate": "2026-09-20", "dueTime": "18:30"}""");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var stored = Assert.Single(await factory.GetTasksAsync());
        Assert.Equal(new TimeOnly(18, 30), stored.DueTime);
    }

    [Fact]
    public async Task Clearing_due_date_clears_time_too()
    {
        await factory.ResetAsync();
        var task = NewTask("Встреча", dueDate: new DateOnly(2026, 9, 20), dueTime: new TimeOnly(9, 0));
        await factory.SeedAsync(task);

        var response = await PatchAsync(task.Id, """{"dueDate": null}""");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var stored = Assert.Single(await factory.GetTasksAsync());
        Assert.Null(stored.DueDate);
        Assert.Null(stored.DueTime);
    }

    [Fact]
    public async Task Clears_only_time_keeping_the_day()
    {
        await factory.ResetAsync();
        var task = NewTask("Встреча", dueDate: new DateOnly(2026, 9, 20), dueTime: new TimeOnly(9, 0));
        await factory.SeedAsync(task);

        var response = await PatchAsync(task.Id, """{"dueTime": null}""");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var stored = Assert.Single(await factory.GetTasksAsync());
        Assert.Equal(new DateOnly(2026, 9, 20), stored.DueDate);
        Assert.Null(stored.DueTime);
    }

    [Fact]
    public async Task Rejects_time_without_date()
    {
        await factory.ResetAsync();
        var task = NewTask("Сходить в банк");
        await factory.SeedAsync(task);

        var response = await PatchAsync(task.Id, """{"dueTime": "10:00:00"}""");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var stored = Assert.Single(await factory.GetTasksAsync());
        Assert.Null(stored.DueTime);
    }

    [Fact]
    public async Task Marking_done_keeps_the_due_date()
    {
        await factory.ResetAsync();
        var task = NewTask("Оплатить счёт", dueDate: new DateOnly(2026, 9, 20), dueTime: new TimeOnly(12, 0));
        await factory.SeedAsync(task);

        var response = await PatchAsync(task.Id, """{"isDone": true}""");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var stored = Assert.Single(await factory.GetTasksAsync());
        Assert.True(stored.IsDone);
        Assert.Equal(new DateOnly(2026, 9, 20), stored.DueDate);
        Assert.Equal(new TimeOnly(12, 0), stored.DueTime);
    }

    [Fact]
    public async Task Moves_task_to_another_project()
    {
        await factory.ResetAsync();
        var from = NewProject("Дом");
        var to = NewProject("Работа");
        await factory.SeedAsync(from, to);
        var task = NewTask("Позвонить в банк");
        task.ProjectId = from.Id;
        await factory.SeedAsync(task);

        var response = await PatchAsync(task.Id, $$"""{"projectId": "{{to.Id}}"}""");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var updated = await response.Content.ReadFromJsonAsync<TaskResponse>();
        Assert.NotNull(updated);
        Assert.Equal(to.Id, updated.ProjectId);

        Assert.Equal(to.Id, Assert.Single(await factory.GetTasksAsync()).ProjectId);
    }

    [Fact]
    public async Task Removes_task_from_project()
    {
        await factory.ResetAsync();
        var project = NewProject("Дом");
        await factory.SeedAsync(project);
        var task = NewTask("Полить цветы");
        task.ProjectId = project.Id;
        await factory.SeedAsync(task);

        var response = await PatchAsync(task.Id, """{"projectId": null}""");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Null(Assert.Single(await factory.GetTasksAsync()).ProjectId);
    }

    [Fact]
    public async Task Marking_done_keeps_the_project()
    {
        await factory.ResetAsync();
        var project = NewProject("Дом");
        await factory.SeedAsync(project);
        var task = NewTask("Полить цветы");
        task.ProjectId = project.Id;
        await factory.SeedAsync(task);

        var response = await PatchAsync(task.Id, """{"isDone": true}""");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var stored = Assert.Single(await factory.GetTasksAsync());
        Assert.True(stored.IsDone);
        Assert.Equal(project.Id, stored.ProjectId);
    }

    [Fact]
    public async Task Rejects_unknown_project()
    {
        await factory.ResetAsync();
        var task = NewTask("Полить цветы");
        await factory.SeedAsync(task);

        var response = await PatchAsync(task.Id, $$"""{"projectId": "{{Guid.NewGuid()}}"}""");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Null(Assert.Single(await factory.GetTasksAsync()).ProjectId);
    }

    [Fact]
    public async Task Rejects_malformed_date()
    {
        await factory.ResetAsync();
        var task = NewTask("Записаться на приём");
        await factory.SeedAsync(task);

        var response = await PatchAsync(task.Id, """{"dueDate": "20.09.2026"}""");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
