namespace Nota.Api.Contracts;

public record TaskResponse(
    Guid Id,
    string Title,
    bool IsDone,
    DateTimeOffset CreatedAt,
    DateOnly? DueDate,
    TimeOnly? DueTime);
