namespace Todolist.Api.Contracts;

/// <summary>Тело PATCH: нужное значение отметки, а не переключение.
/// Явное значение делает повтор запроса безвредным.</summary>
public record UpdateTaskDoneRequest(bool? IsDone);
