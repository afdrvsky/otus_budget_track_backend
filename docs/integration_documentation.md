# Integration Documentation — Backend

## 1. CI/CD

### Pipeline

```
push/PR to master
    │
    ▼
┌─────────────────┐
│ Lint & Format   │  typecheck → eslint → prettier:check
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐ ┌───────┐
│ Tests │ │ Build │  vitest (83 теста) → tsc
└───┬───┘ └───┬───┘
    └────┬────┘
         ▼
┌─────────────────┐
│ Deploy (master) │  railway up
└─────────────────┘
```

Файл конфигурации: `.github/workflows/ci-cd.yml`

### Triggers

- **Push to `master`** → полный pipeline + deploy
- **Pull request to `master`** → pipeline без deploy

### Jobs

| Job | Что делает | Условие |
|---|---|---|
| `lint-and-format` | TypeScript check, ESLint, Prettier | Всегда |
| `test` | Vitest (83 теста) | После lint |
| `build` | `tsc` компиляция | После lint |
| `deploy` | Railway CLI deploy | master push only |

### Деплой на Railway

```bash
npm install -g @railway/cli
railway up --service $RAILWAY_SERVICE_ID
```

GitHub Secrets: `RAILWAY_TOKEN`, `RAILWAY_SERVICE_ID`.

---

## 2. Интеграции сервисов

### Supabase (Auth + Postgres + RLS)

Backend использует два Supabase клиента:

| Клиент | Key | Назначение |
|---|---|---|
| `supabase` | anon key | Auth операции (signUp, signIn, getUser) |
| `supabaseAdmin` | service_role key | CRUD данные (обходит RLS) |

**Почему `supabaseAdmin` для данных:** Backend сам контролирует доступ через `authMiddleware` (JWT верификация). Все запросы фильтруются по `.eq('user_id', userId)` из верифицированного токена.

Конфигурация: `src/config/supabase.ts`

```typescript
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);
export const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey);
```

### Google OAuth (через Supabase)

Flow: Frontend → `/api/auth/google` → Supabase OAuth URL → Google → Supabase callback → Frontend `/auth/callback`.

Backend выступает как тонкий redirect-слой:

```typescript
const redirectUrl = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${frontendUrl}/auth/callback`;
res.redirect(redirectUrl);
```

Конфигурация: `src/routes/googleAuth.ts`

### Pino (Логирование)

- **Production:** JSON в stdout → Railway Logs
- **Development:** pino-pretty (цветной)
- **Redact:** пароли, токены, authorization headers
- **RequestId:** UUID на каждый запрос

Конфигурация: `src/utils/logger.ts`, `src/utils/requestId.ts`

### Health Checks

| Endpoint | Назначение |
|---|---|
| `GET /api/health` | Полная проверка (БД, память, uptime) |
| `GET /api/health/live` | Liveness probe (Railway) |
| `GET /api/health/ready` | Readiness probe (БД) |

---

## 3. Мониторинг

### Railway (встроенный)

- **Logs** — Dashboard → Deployments → Logs (JSON парсинг автоматически)
- **Metrics** — CPU, RAM, Network графики
- **Health Check** — `/api/health/live`, авто-перезапуск при падении
- **Deployments** — история с rollback

### UptimeRobot (внешний)

- Monitor: `HTTPS`
- URL: `https://otusbudgettrackbackend-production.up.railway.app/api/health`
- Interval: 5 минут
- Alerts: Email + Telegram

### Pino логирование

Уровни: `debug` (dev only), `info`, `warn` (4xx), `error` (5xx), `fatal`.

Каждый лог содержит: `level`, `time`, `requestId`, `method`, `url`, `status`, `duration`, `ip`.

### AI анализ логов

Промпты: [log-analysis-prompts.md](log-analysis-prompts.md)

Сценарии:
- Всплески 5xx ошибок
- Медленные запросы (>1000ms)
- Brute force детекция (401 спам)
- Memory leak (рост heapUsed)
- Трассировка по requestId
- Daily health summary

---

## 4. Примеры конфигураций

### `.env` (Railway)

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NODE_ENV=production
CORS_ORIGIN=https://otus-budget-track-web.vercel.app
FRONTEND_URL=https://otus-budget-track-web.vercel.app
PORT=8080
```

### Health check response

```json
{
  "status": "ok",
  "timestamp": "2026-06-13T12:00:00Z",
  "uptime": "2d 5h 30m 15s",
  "version": "1.0.0",
  "responseTime": "52ms",
  "checks": {
    "database": { "status": "ok", "responseTime": "45ms" },
    "memory": { "rss": "85MB", "heapUsed": "42MB", "heapTotal": "64MB" }
  }
}
```

### Pino log (production)

```json
{
  "level": "info",
  "time": 1718085600000,
  "requestId": "a1b2c3d4-...",
  "method": "GET",
  "url": "/api/transactions",
  "status": 200,
  "duration": 45,
  "ip": "1.2.3.4",
  "msg": "Request completed"
}
```
