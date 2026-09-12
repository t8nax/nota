using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nota.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddTaskDueDate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateOnly>(
                name: "DueDate",
                table: "tasks",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<TimeOnly>(
                name: "DueTime",
                table: "tasks",
                type: "time without time zone",
                nullable: true);

            migrationBuilder.AddCheckConstraint(
                name: "CK_tasks_DueTimeRequiresDueDate",
                table: "tasks",
                sql: "\"DueTime\" IS NULL OR \"DueDate\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_tasks_DueTimeRequiresDueDate",
                table: "tasks");

            migrationBuilder.DropColumn(
                name: "DueDate",
                table: "tasks");

            migrationBuilder.DropColumn(
                name: "DueTime",
                table: "tasks");
        }
    }
}
