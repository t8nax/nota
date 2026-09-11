namespace Todolist.Api.Domain;

public class TodoTask
{
    /// <summary>Предел длины заголовка: им же ограничена колонка в базе.</summary>
    public const int TitleMaxLength = 500;

    public Guid Id { get; set; }
    public required string Title { get; set; }
    public bool IsDone { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
