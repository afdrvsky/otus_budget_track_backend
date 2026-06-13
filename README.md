# Budget Track Backend

REST API для приложения учёта личного бюджета. Аутентификация и хранение данных — через Supabase.

## Стек

- **Node.js** + **Express 5** + TypeScript
- **Supabase** — Auth + Postgres (RLS)
- **Pino** — структурированное логирование (JSON)
- **express-validator** — валидация запросов
- **Helmet** — безопасные HTTP-заголовки
- **express-rate-limit** — rate limiting
- **Vitest** + Supertest — тестирование (83 теста)

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
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (обходит RLS) |
| `PORT` | Порт сервера (по умолчанию 8080) |
| `NODE_ENV` | `development` / `production` |
| `CORS_ORIGIN` | Разрешённый origin фронтенда (через запятую) |
| `FRONTEND_URL` | URL фронтенда для OAuth redirect |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |

Примени миграции из `supabase/migrations/` к Supabase проекту.

## Запуск

```bash
npm run dev      # Development с hot reload
npm run build    # Production сборка
npm start        # Запуск production сборки
```

## Тесты

```bash
npm test              # Запуск всех тестов
npm run test:watch    # Watch mode
npm run test:coverage # С покрытием
```

## Линтинг и форматирование

```bash
npm run lint          # ESLint
npm run lint:fix      # ESLint с автоисправлением
npm run format        # Prettier форматирование
npm run format:check  # Проверка Prettier
npm run typecheck     # TypeScript проверка без сборки
```

## API

### Аутентификация

| Метод | Путь | Описание | Auth |
|---|---|---|---|
| POST | `/api/auth/register` | Регистрация | Нет |
| POST | `/api/auth/login` | Вход (email/password) | Нет |
| POST | `/api/auth/logout` | Выход | Да |
| POST | `/api/auth/recover` | Восстановление пароля | Нет |
| GET | `/api/auth/google` | Google OAuth redirect | Нет |

### Пользователь

| Метод | Путь | Описание | Auth |
|---|---|---|---|
| GET | `/api/user` | Текущий пользователь | Да |

### Категории

| Метод | Путь | Описание | Auth |
|---|---|---|---|
| GET | `/api/categories` | Список (?type=income/expense) | Да |
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

### Health Check

| Метод | Путь | Описание |
|---|---|---|
| GET | `/api/health` | Полная проверка (БД, память, uptime) |
| GET | `/api/health/live` | Liveness probe |
| GET | `/api/health/ready` | Readiness probe (БД) |

## Структура проекта

```
src/
  config/          — env, Supabase клиент
  controllers/     — HTTP-обработчики + валидация
  middleware/      — auth, errorHandler, requestLogger, rateLimiter
  routes/          — привязка маршрутов (auth, categories, transactions, health, googleAuth)
  services/        — бизнес-логика (Supabase queries через supabaseAdmin)
  types/           — TypeScript типы
  utils/           — logger (pino), requestId
  __tests__/       — тесты (83 теста, 8 файлов)
supabase/
  migrations/      — SQL-миграции (таблицы, RLS, триггеры)
docs/              — документация
```

## База данных

- **profiles** — профили пользователей (авто-создание при регистрации)
- **categories** — категории доходов/расходов (13 дефолтных при регистрации)
- **transactions** — финансовые операции

Все таблицы защищены Row Level Security. Backend использует `supabaseAdmin` (service_role key) для доступа к данным — авторизация контролируется через `authMiddleware` (JWT верификация).

## Безопасность

- Rate limiting: auth (20/15min), general (100/15min)
- CORS: strict (явные origins только)
- Helmet: безопасные HTTP-заголовки
- Body size limit: 10kb
- Password: 8+ символов, upper/lower/digit/special
- Error handling: generic messages в production
- Pino redact: пароли и токены автоматически скрываются в логах

Подробности: [docs/security_audit.md](docs/security_audit.md)

## CI/CD

GitHub Actions pipeline: lint → test → build → deploy to Railway.

Подробности: [docs/integration_documentation.md](docs/integration_documentation.md)

## Мониторинг и логирование

- **Pino** — структурированные JSON-логи → Railway Logs
- **Health endpoints** — `/api/health`, `/api/health/live`, `/api/health/ready`
- **RequestId** — каждый запрос получает UUID для трассировки
- **AI промпты** — [docs/log-analysis-prompts.md](docs/log-analysis-prompts.md)

Подробности: [docs/integration_documentation.md](docs/integration_documentation.md#3-мониторинг)
