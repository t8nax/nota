namespace Nota.Api.Domain;

public class TodoTask
{
    /// <summary>Предел длины заголовка: им же ограничена колонка в базе.</summary>
    public const int TitleMaxLength = 500;

    public Guid Id { get; set; }
    public required string Title { get; set; }
    public bool IsDone { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>День срока в календаре пользователя. Null — срока нет.</summary>
    public DateOnly? DueDate { get; set; }

    /// <summary>Время срока внутри дня. Null при заданной дате — задача на день целиком.
    /// Времени без даты не бывает: это состояние запрещено проверкой в базе.</summary>
    public TimeOnly? DueTime { get; set; }
}
