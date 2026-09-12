namespace Nota.Api.Contracts;

/// <summary>Тело POST. Срок необязателен, время внутри срока — тоже.</summary>
public record CreateTaskRequest(string? Title, DateOnly? DueDate = null, TimeOnly? DueTime = null);
