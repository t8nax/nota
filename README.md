# todolist

Личный список дел: API на .NET 10, фронтенд на React + TypeScript, база PostgreSQL.

## Структура

- `backend/` — solution .NET: `src/Todolist.Api` (минимальный API, EF Core), `tests/Todolist.Api.Tests` (интеграционные тесты)
- `frontend/` — приложение на Vite + React + TypeScript
- `docker-compose.yml` — PostgreSQL для разработки

## Запуск

```bash
# 1. База (порт 5434, чтобы не конфликтовать с другими проектами)
docker compose up -d db

# 2. Миграции
dotnet ef database update --project backend/src/Todolist.Api --startup-project backend/src/Todolist.Api

# 3. API на http://localhost:5119
dotnet run --project backend/src/Todolist.Api --launch-profile http

# 4. Фронтенд на http://localhost:5173 (запросы к /api проксируются на API)
cd frontend && npm install && npm run dev
```

## Тесты

```bash
dotnet test backend/Todolist.sln
```

Тестам нужна поднятая база: они работают с отдельной базой `todolist_test` на том же сервере.
