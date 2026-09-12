namespace Nota.Api.Contracts;

/// <summary>Тело PATCH: менять у проекта нечего, кроме имени, и оно обязательно.</summary>
public record UpdateProjectRequest(string? Name);
