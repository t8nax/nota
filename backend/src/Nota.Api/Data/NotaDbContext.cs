using Microsoft.EntityFrameworkCore;
using Nota.Api.Domain;

namespace Nota.Api.Data;

public class NotaDbContext(DbContextOptions<NotaDbContext> options) : DbContext(options)
{
    public DbSet<TodoTask> Tasks => Set<TodoTask>();

    public DbSet<Project> Projects => Set<Project>();

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
            // Удаление проекта уносит его задачи: решение человека — проект удаляется
            // со всем содержимым, как в Todoist. Каскад стоит в базе, а не в коде,
            // чтобы задача не пережила свой проект ни при какой записи.
            task.HasOne<Project>()
                .WithMany()
                .HasForeignKey(t => t.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Project>(project =>
        {
            project.ToTable("projects");
            project.HasKey(p => p.Id);
            project.Property(p => p.Name).HasMaxLength(Project.NameMaxLength).IsRequired();
            project.Property(p => p.CreatedAt).IsRequired();
        });
    }
}
