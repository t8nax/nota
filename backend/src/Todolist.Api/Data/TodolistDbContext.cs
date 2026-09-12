using Microsoft.EntityFrameworkCore;
using Todolist.Api.Domain;

namespace Todolist.Api.Data;

public class TodolistDbContext(DbContextOptions<TodolistDbContext> options) : DbContext(options)
{
    public DbSet<TodoTask> Tasks => Set<TodoTask>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<TodoTask>(task =>
        {
            // Время без даты — бессмысленное состояние срока, и проверка в базе держит это
            // независимо от того, какой код в неё пишет.
            task.ToTable("tasks", t => t.HasCheckConstraint(
                "CK_tasks_DueTimeRequiresDueDate",
                "\"DueTime\" IS NULL OR \"DueDate\" IS NOT NULL"));
            task.HasKey(t => t.Id);
            task.Property(t => t.Title).HasMaxLength(TodoTask.TitleMaxLength).IsRequired();
            task.Property(t => t.CreatedAt).IsRequired();
        });
    }
}
