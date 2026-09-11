namespace Todolist.Api.Tests;

/// <summary>
/// Все тесты ходят в одну базу `todolist_test`, которую фабрика создаёт и удаляет.
/// Общая коллекция даёт один экземпляр фабрики на сборку и запрещает параллельный
/// прогон классов: иначе один класс удаляет базу, пока другой в неё пишет.
/// </summary>
[CollectionDefinition(nameof(ApiCollection))]
public class ApiCollection : ICollectionFixture<TodolistApiFactory>;
