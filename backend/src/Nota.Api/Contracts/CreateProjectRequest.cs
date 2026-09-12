namespace Nota.Api.Contracts;

/// <summary>Тело POST: у проекта есть только имя.</summary>
public record CreateProjectRequest(string? Name);
