# Budget Track Backend — Документация

## 1. Архитектурное описание

### Общая схема

```
[Клиент (Web/Mobile)]
        │
        ▼
[Express API Server :8080]
        │
   ┌────┴────┐
   ▼         ▼
[Auth]    [CRUD]
   │         │
   ▼         ▼
[Supabase Auth]  [Supabase Postgres]
                       │
                  ┌────┴────┐
                  ▼         ▼
            [profiles]  [categories]
                  │         │
                  └────┬────┘
                       ▼
                 [transactions]
```

### Компоненты

- **Express API** — REST API на Node.js/TypeScript, выступает как тонкий слой между клиентом и Supabase
- **Supabase Auth** — управление пользователями (регистрация, вход, восстановление пароля)
- **Supabase Postgres** — хранение данных с Row Level Security (RLS)
- **Middleware** — авторизация через JWT, валидация запросов, обработка ошибок

### Структура проекта

```
src/
  config/         — конфигурация (env, supabase client)
  middleware/     — auth, errorHandler
  controllers/    — обработка HTTP-запросов и валидация
  services/       — бизнес-логика
  routes/         — привязка маршрутов к контроллерам
  types/          — TypeScript типы
index.ts          — точка входа
```

---

## 2. SQL-схема базы данных

### Таблицы

**profiles** — профили пользователей (создаётся автоматически при регистрации через триггер)

| Поле       | Тип          | Ограничения                     |
|------------|--------------|---------------------------------|
| id         | UUID         | PK, FK → auth.users(id)         |
| email      | TEXT         | NOT NULL, UNIQUE                |
| full_name  | TEXT         |                                 |
| currency   | TEXT         | NOT NULL, DEFAULT 'RUB'         |
| created_at | TIMESTAMPTZ  | NOT NULL, DEFAULT now()         |
| updated_at | TIMESTAMPTZ  | NOT NULL, DEFAULT now()         |

**categories** — категории доходов/расходов

| Поле       | Тип          | Ограничения                              |
|------------|--------------|------------------------------------------|
| id         | UUID         | PK, DEFAULT gen_random_uuid()            |
| user_id    | UUID         | NOT NULL, FK → profiles(id) CASCADE      |
| name       | TEXT         | NOT NULL                                 |
| type       | TEXT         | NOT NULL, CHECK (income/expense)         |
| color      | TEXT         | NOT NULL, DEFAULT '#6B7280'              |
| is_default | BOOLEAN      | NOT NULL, DEFAULT false                  |
| created_at | TIMESTAMPTZ  | NOT NULL, DEFAULT now()                  |
| updated_at | TIMESTAMPTZ  | NOT NULL, DEFAULT now()                  |

UNIQUE (user_id, name, type)

**transactions** — финансовые операции

| Поле             | Тип          | Ограничения                              |
|------------------|--------------|------------------------------------------|
| id               | UUID         | PK, DEFAULT gen_random_uuid()            |
| user_id          | UUID         | NOT NULL, FK → profiles(id) CASCADE      |
| category_id      | UUID         | NOT NULL, FK → categories(id) RESTRICT   |
| amount           | NUMERIC(12,2)| NOT NULL, CHECK > 0                      |
| type             | TEXT         | NOT NULL, CHECK (income/expense)         |
| comment          | TEXT         |                                          |
| transaction_date | DATE         | NOT NULL, DEFAULT CURRENT_DATE           |
| created_at       | TIMESTAMPTZ  | NOT NULL, DEFAULT now()                  |
| updated_at       | TIMESTAMPTZ  | NOT NULL, DEFAULT now()                  |

### RLS-политики

Все таблицы имеют Row Level Security. Пользователь может работать только со своими данными:
- profiles: SELECT/UPDATE WHERE auth.uid() = id
- categories: full CRUD WHERE auth.uid() = user_id
- transactions: full CRUD WHERE auth.uid() = user_id

### Триггеры

1. `handle_new_user` — автоматически создаёт профиль в public.profiles при регистрации в auth.users
2. `seed_default_categories` — автоматически создаёт дефолтные категории при создании профиля

---

## 3. API Endpoints

### Аутентификация

| Метод  | Путь            | Описание                     | Auth |
|--------|-----------------|------------------------------|------|
| POST   | /api/auth/register   | Регистрация пользователя     | Нет  |
| POST   | /api/auth/login      | Вход (получение JWT)         | Нет  |
| POST   | /api/auth/logout     | Выход                        | Да   |
| POST   | /api/auth/recover    | Восстановление пароля        | Нет  |

### Категории

| Метод  | Путь                  | Описание                     | Auth |
|--------|-----------------------|------------------------------|------|
| GET    | /api/categories       | Список категорий             | Да   |
| POST   | /api/categories       | Создать категорию            | Да   |
| PUT    | /api/categories/:id   | Обновить категорию           | Да   |
| DELETE | /api/categories/:id   | Удалить категорию            | Да   |

### Транзакции

| Метод  | Путь                    | Описание                     | Auth |
|--------|-------------------------|------------------------------|------|
| GET    | /api/transactions       | Список транзакций            | Да   |
| POST   | /api/transactions       | Создать транзакцию           | Да   |
| PUT    | /api/transactions/:id   | Обновить транзакцию          | Да   |
| DELETE | /api/transactions/:id   | Удалить транзакцию           | Да   |

### Health check

| Метод | Путь          | Описание         |
|-------|---------------|------------------|
| GET   | /api/health   | Проверка статуса  |

---

## 4. Примеры запросов и ответов

### Регистрация

```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure123",
  "full_name": "Иван Иванов"
}
```

Ответ `201`:
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "user_metadata": { "full_name": "Иван Иванов" }
  },
  "session": {
    "access_token": "eyJ...",
    "refresh_token": "...",
    "expires_at": 1234567890
  }
}
```

### Вход

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure123"
}
```

Ответ `200`:
```json
{
  "user": { "id": "uuid", "email": "user@example.com" },
  "session": { "access_token": "eyJ...", "refresh_token": "..." }
}
```

### Получение категорий

```bash
GET /api/categories?type=expense
Authorization: Bearer eyJ...
```

Ответ `200`:
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "name": "Еда",
    "type": "expense",
    "color": "#EF4444",
    "is_default": true,
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-01T00:00:00Z"
  }
]
```

### Создание категории

```bash
POST /api/categories
Authorization: Bearer eyJ...
Content-Type: application/json

{
  "name": "Подписки",
  "type": "expense",
  "color": "#8B5CF6"
}
```

Ответ `201`:
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "Подписки",
  "type": "expense",
  "color": "#8B5CF6",
  "is_default": false,
  "created_at": "2025-01-01T12:00:00Z",
  "updated_at": "2025-01-01T12:00:00Z"
}
```

### Получение транзакций (с фильтрацией)

```bash
GET /api/transactions?type=expense&date_from=2025-01-01&date_to=2025-01-31
Authorization: Bearer eyJ...
```

Ответ `200`:
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "category_id": "uuid",
    "amount": 1500.00,
    "type": "expense",
    "comment": "Обед в кафе",
    "transaction_date": "2025-01-15",
    "created_at": "2025-01-15T12:00:00Z",
    "updated_at": "2025-01-15T12:00:00Z",
    "categories": {
      "id": "uuid",
      "name": "Еда",
      "type": "expense",
      "color": "#EF4444"
    }
  }
]
```

### Создание транзакции

```bash
POST /api/transactions
Authorization: Bearer eyJ...
Content-Type: application/json

{
  "category_id": "uuid",
  "amount": 5000.00,
  "type": "income",
  "transaction_date": "2025-01-20",
  "comment": "Фриланс проект"
}
```

Ответ `201`:
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "category_id": "uuid",
  "amount": 5000.00,
  "type": "income",
  "comment": "Фриланс проект",
  "transaction_date": "2025-01-20",
  "created_at": "2025-01-20T10:00:00Z",
  "updated_at": "2025-01-20T10:00:00Z",
  "categories": {
    "id": "uuid",
    "name": "Фриланс",
    "type": "income",
    "color": "#3B82F6"
  }
}
```

### Ошибки

```json
// 401 — неавторизован
{ "error": "Missing or invalid authorization header" }

// 404 — не найдено
{ "error": "Category not found" }

// 422 — ошибка валидации
{
  "error": "Validation failed",
  "details": [
    { "msg": "Name is required", "param": "name", "location": "body" }
  ]
}

// 422 — бизнес-правило
{ "error": "Cannot delete category: 3 linked transaction(s) exist. Reassign them first." }

// 500 — серверная ошибка
{ "error": "Internal server error" }
```

---

## 5. Примеры интеграции с фронтендом (supabase-js)

### Настройка клиента

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);
```

### Регистрация и вход (прямой вызов Supabase Auth)

```typescript
// Регистрация
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'secure123',
  options: { data: { full_name: 'Иван Иванов' } },
});

// Вход
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'secure123',
});

// Токен для API-запросов
const token = data.session.access_token;
```

### Вызовы API через fetch

```typescript
const token = (await supabase.auth.getSession()).data.session?.access_token;

// Получить категории
const res = await fetch('/api/categories?type=expense', {
  headers: { Authorization: `Bearer ${token}` },
});
const categories = await res.json();

// Создать транзакцию
const res = await fetch('/api/transactions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    category_id: 'uuid',
    amount: 1500,
    type: 'expense',
    transaction_date: '2025-01-15',
    comment: 'Обед',
  }),
});
```

---

## 6. Инструкции по развёртыванию

### Предварительные требования

- Node.js 18+
- Supabase проект (cloud или self-hosted)
- Применённые миграции из `supabase/migrations/`

### Локальная разработка

```bash
# 1. Клонировать репозиторий
cd budget_track_backend

# 2. Установить зависимости
npm install

# 3. Скопировать и заполнить .env
cp .env.example .env
# Заполнить SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

# 4. Запустить в режиме разработки
npm run dev
```

### Production

```bash
# Сборка
npm run build

# Запуск
npm start
```

### Переменные окружения

| Переменная                 | Описание                            |
|---------------------------|-------------------------------------|
| SUPABASE_URL              | URL проекта Supabase                |
| SUPABASE_ANON_KEY         | Anon key (публичный)                |
| SUPABASE_SERVICE_ROLE_KEY | Service role key (секретный)        |
| JWT_SECRET                | Секрет JWT Supabase                 |
| PORT                      | Порт сервера (по умолчанию 8080)    |
| CORS_ORIGIN               | Разрешённый origin (по умолчанию *) |

---

## 7. Рекомендации по безопасности

### CORS

В production укажите конкретные домены вместо `*`:
```
CORS_ORIGIN=https://your-frontend.com,https://mobile-app.com
```

### RLS

Row Level Security включён для всех таблиц. Пользователь может работать только со своими данными. Проверка идёт на уровне БД через `auth.uid()`.

### Хранение секретов

- `.env` файл добавлен в `.gitignore`
- Service role key используется только в серверном коде, никогда не передаётся клиенту
- JWT-токены проверяются через Supabase Auth на каждом запросе

### Helmet

API использует `helmet` для установки безопасных HTTP-заголовков (X-Content-Type-Options, X-Frame-Options, и т.д.).

### Валидация

Все входные данные валидируются через `express-validator` перед обработкой.

---

## 8. Обработка ошибок и логирование

### Централизованный обработчик

Все ошибки проходят через `errorHandler` middleware, который возвращает JSON с полем `error` и опциональным `details`.

### Коды ошибок

| Код | Ситуация                                          |
|-----|---------------------------------------------------|
| 401 | Отсутствует или недействителен токен              |
| 404 | Ресурс не найден                                  |
| 422 | Ошибка валидации или нарушение бизнес-правила     |
| 500 | Внутренняя ошибка сервера                         |

### Логирование

Для production рекомендуется добавить middleware логирования запросов (например, `morgan`) и структурированное логирование ошибок.
