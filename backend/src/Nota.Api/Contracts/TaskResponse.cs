namespace Nota.Api.Contracts;

public record TaskResponse(
    Guid Id,
    string Title,
    bool IsDone,
    DateTimeOffset CreatedAt,
    Guid? ProjectId,
    DateOnly? DueDate,
    TimeOnly? DueTime);
