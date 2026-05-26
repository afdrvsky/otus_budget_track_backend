# Budget Track Backend

REST API для приложения учёта личного бюджета. Аутентификация и хранение данных — через Supabase.

## Стек

- **Node.js** + **Express 5** + TypeScript
- **Supabase** — Auth + Postgres (RLS)
- **express-validator** — валидация запросов
- **Helmet** — безопасные HTTP-заголовки
- **Vitest** + Supertest — тестирование

## Установка

```bash
npm install
```

## Настройка

```bash
cp .env.example .env
```

Заполни переменные:

| Переменная | Описание |
|---|---|
| `SUPABASE_URL` | URL проекта Supabase |
| `SUPABASE_ANON_KEY` | Anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key |
| `JWT_SECRET` | JWT secret Supabase |
| `PORT` | Порт сервера (по умолчанию 8080) |
| `CORS_ORIGIN` | Разрешённый origin фронтенда |

Примени миграции из `supabase/migrations/` к Supabase проекту.

## Запуск

```bash
npm run dev
```

## Сборка

```bash
npm run build
npm start
```

## Тесты

```bash
npm test
npm run test:watch
npm run test:coverage
```

## API

### Аутентификация

| Метод | Путь | Описание | Auth |
|---|---|---|---|
| POST | `/api/auth/register` | Регистрация | Нет |
| POST | `/api/auth/login` | Вход | Нет |
| POST | `/api/auth/logout` | Выход | Да |
| POST | `/api/auth/recover` | Восстановление пароля | Нет |

### Категории

| Метод | Путь | Описание | Auth |
|---|---|---|---|
| GET | `/api/categories` | Список категорий (?type=income/expense) | Да |
| POST | `/api/categories` | Создать категорию | Да |
| PUT | `/api/categories/:id` | Обновить категорию | Да |
| DELETE | `/api/categories/:id` | Удалить категорию | Да |

### Транзакции

| Метод | Путь | Описание | Auth |
|---|---|---|---|
| GET | `/api/transactions` | Список (?type, ?category_id, ?date_from, ?date_to) | Да |
| POST | `/api/transactions` | Создать транзакцию | Да |
| PUT | `/api/transactions/:id` | Обновить транзакцию | Да |
| DELETE | `/api/transactions/:id` | Удалить транзакцию | Да |

### Health check

| Метод | Путь | Описание |
|---|---|---|
| GET | `/api/health` | Проверка статуса |

## Структура проекта

```
src/
  config/          — env, Supabase клиент
  middleware/      — auth (JWT), errorHandler
  controllers/     — HTTP-обработчики + валидация
  services/        — бизнес-логика
  routes/          — привязка маршрутов
  types/           — TypeScript типы
  __tests__/       — тесты (83 теста, 8 файлов)
supabase/
  migrations/      — SQL-миграции (таблицы, RLS, триггеры)
```

## База данных

- **profiles** — профили пользователей (авто-создание при регистрации)
- **categories** — категории доходов/расходов (13 дефолтных при регистрации)
- **transactions** — финансовые операции

Все таблицы защищены Row Level Security. Пользователь имеет доступ только к своим данным.
