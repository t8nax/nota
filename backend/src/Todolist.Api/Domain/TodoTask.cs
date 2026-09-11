namespace Todolist.Api.Domain;

public class TodoTask
{
    public Guid Id { get; set; }
    public required string Title { get; set; }
    public bool IsDone { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
