namespace Todolist.Api.Contracts;

public record TaskResponse(Guid Id, string Title, bool IsDone, DateTimeOffset CreatedAt);
