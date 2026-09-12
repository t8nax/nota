namespace Nota.Api.Contracts;

/// <summary>
/// Тело PATCH: переданные поля меняются, непереданные остаются как были.
/// Значения явные, а не переключатели, поэтому повтор запроса безвреден.
/// </summary>
public record UpdateTaskRequest(
    Patch<bool?> IsDone,
    Patch<DateOnly?> DueDate,
    Patch<TimeOnly?> DueTime,
    Patch<Guid?> ProjectId);
