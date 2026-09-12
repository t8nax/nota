namespace Nota.Api.Domain;

public class Project
{
    /// <summary>Предел длины имени: им же ограничена колонка в базе.</summary>
    public const int NameMaxLength = 200;

    public Guid Id { get; set; }
    public required string Name { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
