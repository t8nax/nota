using Microsoft.EntityFrameworkCore;
using Todolist.Api.Data;
using Todolist.Api.Endpoints;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddDbContext<TodolistDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Todolist")));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
app.MapTaskEndpoints();

app.Run();

public partial class Program;
