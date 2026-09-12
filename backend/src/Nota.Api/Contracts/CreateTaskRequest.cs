namespace Nota.Api.Contracts;

/// <summary>Тело POST. Срок необязателен, время внутри срока — тоже; проект — тоже.</summary>
public record CreateTaskRequest(
    string? Title,
    DateOnly? DueDate = null,
    TimeOnly? DueTime = null,
    Guid? ProjectId = null);
