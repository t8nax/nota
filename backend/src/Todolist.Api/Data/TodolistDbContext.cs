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
            task.ToTable("tasks");
            task.HasKey(t => t.Id);
            task.Property(t => t.Title).HasMaxLength(TodoTask.TitleMaxLength).IsRequired();
            task.Property(t => t.CreatedAt).IsRequired();
        });
    }
}
