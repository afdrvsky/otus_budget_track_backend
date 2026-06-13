# Security Audit Report — Backend

**Project:** Budget Track Backend  
**Date:** 2026-06-01  
**Methodology:** OWASP Top 10 (2021)  
**Dependencies audit:** 0 vulnerabilities (`npm audit`)

---

## Сводка

| Метрика | Количество |
|---|---|
| Всего находок | 17 |
| CRITICAL | 1 |
| HIGH | 4 |
| MEDIUM | 5 |
| LOW | 4 |
| INFO | 1 |
| **Исправлено** | **15** |
| Принято (риск приемлем) | 2 |

---

## Список уязвимостей

### F#01 — Отсутствие Rate Limiting на auth endpoints

| Атрибут | Значение |
|---|---|
| **Severity** | CRITICAL |
| **OWASP** | A07 — Identification and Authentication Failures |
| **Статус** | **ИСПРАВЛЕНО** |

**Проблема:** Эндпоинты `/api/auth/register`, `/api/auth/login`, `/api/auth/recover` не имели rate limiting. Возможны brute-force и credential-stuffing атаки.

**Исправление:** Установлен `express-rate-limit`. Создан `src/middleware/rateLimiter.ts`:
- Auth limiter: 20 запросов / 15 минут на `/api/auth`
- General limiter: 100 запросов / 15 минут на `/api`

**Файлы:** `src/middleware/rateLimiter.ts` (новый), `src/index.ts`

---

### F#02 — CORS с wildcard origin

| Атрибут | Значение |
|---|---|
| **Severity** | HIGH |
| **OWASP** | A05 — Security Misconfiguration |
| **Статус** | **ИСПРАВЛЕНО** |

**Проблема:** `CORS_ORIGIN` по умолчанию `*` — любой origin мог делать запросы.

**Исправление:** Default изменён на пустую строку (CORS отключён). Парсит comma-separated origins, `credentials: true`.

**Файлы:** `src/config/env.ts`, `src/index.ts`

---

### F#03 — Утечка raw Supabase ошибок клиентам

| Атрибут | Значение |
|---|---|
| **Severity** | HIGH |
| **OWASP** | A05 — Security Misconfiguration |
| **Статус** | **ИСПРАВЛЕНО** |

**Проблема:** `register()` и `recoverPassword()` возвращали raw Supabase error messages (например "User already registered"), помогая атакующим в recon.

**Исправление:** Заменены на generic messages: "Registration failed" и "Unable to send recovery email".

**Файлы:** `src/services/authService.ts`

---

### F#04 — Отсутствие лимита размера тела запроса

| Атрибут | Значение |
|---|---|
| **Severity** | HIGH |
| **OWASP** | A04 — Insecure Design |
| **Статус** | **ИСПРАВЛЕНО** |

**Проблема:** `express.json()` вызывался без явного лимита — DoS через большие payload.

**Исправление:** Установлен лимит `10kb`.

**Файлы:** `src/index.ts`

---

### F#05 — Утечка деталей ошибок в production

| Атрибут | Значение |
|---|---|
| **Severity** | MEDIUM |
| **OWASP** | A05 — Security Misconfiguration |
| **Статус** | **ИСПРАВЛЕНО** |

**Проблема:** 500 ошибки возвращали оригинальный message и details клиентам в любом окружении.

**Исправление:** В non-development режиме 500 ошибки возвращают generic "Internal server error". Stack trace логируется через Pino только на сервере.

**Файлы:** `src/config/env.ts`, `src/middleware/errorHandler.ts`

---

### F#06 — Отсутствие security логирования

| Атрибут | Значение |
|---|---|
| **Severity** | HIGH |
| **OWASP** | A09 — Security Logging and Monitoring Failures |
| **Статус** | **ИСПРАВЛЕНО** |

**Проблема:** Ноль security-relevant логов. Failed auth, 500 errors — всё проходило незаметно.

**Исправление:** Добавлен Pino structured logging. RequestId для трассировки. Логирование всех 4xx/5xx. Redact паролей и токенов.

**Файлы:** `src/utils/logger.ts`, `src/utils/requestId.ts`, `src/middleware/requestLogger.ts`, `src/middleware/errorHandler.ts`

---

### F#07 — Неиспользуемый JWT Secret

| Атрибут | Значение |
|---|---|
| **Severity** | LOW |
| **OWASP** | A05 — Security Misconfiguration |
| **Статус** | **ИСПРАВЛЕНО** |

**Проблема:** `jwtSecret` определён в config, но не использовался (Supabase handles JWT).

**Исправление:** Удалён из `src/config/env.ts` и `.env.example`.

---

### F#08 — Logout через anon клиент

| Атрибут | Значение |
|---|---|
| **Severity** | MEDIUM |
| **OWASP** | A07 — Identification and Authentication Failures |
| **Статус** | **ИСПРАВЛЕНО** |

**Проблема:** `supabase.auth.admin.signOut(token)` вызывался на anon-key клиенте без admin привилегий. Токены могли не инвалидироваться.

**Исправление:** Изменено на `supabaseAdmin.auth.admin.signOut(token)`.

**Файлы:** `src/services/authService.ts`

---

### F#09 — Отсутствие проверки ownership категории при update транзакции

| Атрибут | Значение |
|---|---|
| **Severity** | MEDIUM |
| **OWASP** | A01 — Broken Access Control |
| **Статус** | **ИСПРАВЛЕНО** |

**Проблема:** `updateTransaction` не проверял, что новый `category_id` принадлежит пользователю.

**Исправление:** Добавлена проверка ownership категории и консистентности типа.

**Файлы:** `src/services/transactionService.ts`

---

### F#10 — Несоответствие типа/категории при update

| Атрибут | Значение |
|---|---|
| **Severity** | LOW |
| **OWASP** | A04 — Insecure Design |
| **Статус** | **ИСПРАВЛЕНО** |

**Проблема:** Изменение `type` без `category_id` могло оставить транзакцию с несоответствующим типом категории.

**Исправление:** При изменении `type` без `categoryId` существующий тип категории валидируется.

**Файлы:** `src/services/transactionService.ts`

---

### F#11 — .env.example паттерны

| Атрибут | Значение |
|---|---|
| **Severity** | LOW |
| **OWASP** | A02 — Cryptographic Failures |
| **Статус** | **ИСПРАВЛЕНО** |

**Проблема:** Placeholder-ы с числовыми суффиксами могли намекать на метод генерации.

**Исправление:** Заменены на generic `your-xxx-here`.

**Файлы:** `.env.example`

---

### F#12 — supabaseAdmin scope

| Атрибут | Значение |
|---|---|
| **Severity** | MEDIUM |
| **OWASP** | A01 — Broken Access Control |
| **Статус** | **ПРИНЯТО** |

**Проблема:** `supabaseAdmin` (service_role, обходит RLS) экспортируется и доступен любому модулю.

**Mitigation:** Backend контролирует доступ через `authMiddleware` (JWT верификация). Все запросы фильтруются по `.eq('user_id', userId)`. Стандартный паттерн для backend-first архитектуры. Code review отслеживает misuse.

---

### F#13 — Отсутствие NODE_ENV

| Атрибут | Значение |
|---|---|
| **Severity** | LOW |
| **OWASP** | A05 — Security Misconfiguration |
| **Статус** | **ИСПРАВЛЕНО** |

**Проблема:** Нет `NODE_ENV` — невозможно различать dev/production поведение.

**Исправление:** Добавлен `nodeEnv` в config с default `development`.

**Файлы:** `src/config/env.ts`

---

### F#14 — Удаление категории без user scope

| Атрибут | Значение |
|---|---|
| **Severity** | LOW |
| **OWASP** | A01 — Broken Access Control |
| **Статус** | **ИСПРАВЛЕНО** |

**Проблема:** Count запрос транзакций перед удалением категории не фильтровал по `user_id`.

**Исправление:** Добавлен `.eq('user_id', userId)`.

**Файлы:** `src/services/categoryService.ts`

---

### F#15 — Слабые требования к паролю

| Атрибут | Значение |
|---|---|
| **Severity** | MEDIUM |
| **OWASP** | A07 — Identification and Authentication Failures |
| **Статус** | **ИСПРАВЛЕНО** |

**Проблема:** Валидация требовала только 6+ символов.

**Исправление:** Минимум 8 символов, uppercase, lowercase, digit, special character. Добавлены `normalizeEmail()` и `trim()`.

**Файлы:** `src/controllers/authController.ts`

---

### F#16 — Дублирование AuthRequest интерфейса

| Атрибут | Значение |
|---|---|
| **Severity** | INFO |
| **OWASP** | A04 — Insecure Design |
| **Статус** | **ИСПРАВЛЕНО** |

**Проблема:** `AuthRequest` определён в двух местах, один — dead code без импорта Request.

**Исправление:** Удалён дубликат из `types/index.ts`.

---

### F#17 — Health endpoint публичный

| Атрибут | Значение |
|---|---|
| **Severity** | INFO |
| **OWASP** | A01 — Broken Access Control |
| **Статус** | **ПРИНЯТО** |

**Проблема:** `/api/health` без аутентификации.

**Mitigation:** Стандартная практика. Не раскрывает sensitive данные.

---

## Рекомендации по безопасности

1. **Регулярный npm audit** — запускать `npm audit` еженедельно, обновлять зависимости
2. **Ротация Supabase keys** — периодически ротировать service_role key
3. **Railway secrets** — не хардкодить секреты, использовать Railway variables
4. **Мониторинг логов** — регулярно просматривать Pino логи, настроить UptimeRobot alerts
5. **WAF / DDoS** — при росте нагрузки добавить Cloudflare перед Railway
6. **Penetration testing** — перед production запустить автоматизированный pentest
7. **Backup БД** — настроить automated backups в Supabase Dashboard
8. **Dependency scanning** — добавить Dependabot / Snyk для auto-PR на уязвимые зависимости
9. **Rate limit tuning** — мониторить legitimate traffic и подстраивать лимиты
10. **Security headers** — периодически проверять через securityheaders.com

---

## Security Controls Summary

| Control | Status |
|---|---|
| Rate limiting | auth: 20/15min, general: 100/15min |
| CORS | Strict (explicit origins) |
| Security headers | Helmet (X-Content-Type-Options, X-Frame-Options, etc.) |
| Input validation | express-validator на всех endpoints |
| SQL injection | Supabase parameterized queries |
| XSS | Low risk (API-only, no HTML rendering) |
| CSRF | Mitigated (CORS whitelist, Bearer auth) |
| Error leakage | Generic messages в production |
| Request size limit | 10kb |
| Security logging | Pino structured JSON с redaction |
| Authentication | Supabase JWT |
| Authorization | RLS + authMiddleware |
| Password policy | 8+ chars, upper/lower/digit/special |
| Token invalidation | supabaseAdmin для logout |
| Log redaction | Pino redact (passwords, tokens, authorization) |
| Dependencies | 0 known vulnerabilities |
