# Nota

Личный список дел: API на .NET 10, фронтенд на React + TypeScript, база PostgreSQL.

## Структура

- `backend/` — solution .NET: `src/Nota.Api` (минимальный API, EF Core), `tests/Nota.Api.Tests` (интеграционные тесты)
- `frontend/` — приложение на Vite + React + TypeScript
- `docker-compose.yml` — PostgreSQL для разработки

## Запуск

```bash
# 1. База (порт 5434, чтобы не конфликтовать с другими проектами)
docker compose up -d db

# 2. Миграции
dotnet ef database update --project backend/src/Nota.Api --startup-project backend/src/Nota.Api

# 3. API на http://localhost:5119
dotnet run --project backend/src/Nota.Api --launch-profile http

# 4. Фронтенд на http://localhost:5173 (запросы к /api проксируются на API)
cd frontend && npm install && npm run dev
```

## Тесты

```bash
dotnet test backend/Nota.slnx
```

Тестам нужна поднятая база: они работают с отдельной базой `nota_test` на том же сервере.
