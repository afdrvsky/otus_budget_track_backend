# AI Prompts for Log Analysis

## Log Format

All logs are structured JSON via pino:

```json
{
  "level": "info",
  "time": 1718085600000,
  "requestId": "uuid",
  "method": "GET",
  "url": "/api/transactions",
  "status": 200,
  "duration": 45,
  "ip": "1.2.3.4",
  "msg": "Request completed"
}
```

**Levels:** `debug`, `info`, `warn`, `error`, `fatal`

**Key fields:** `requestId`, `method`, `url`, `status`, `duration`, `err`, `userId`, `email`

---

## Prompt 1: Error Spike Detection

```
Analyze these JSON logs from a Node.js/Express budget tracking app.
Find all entries with level "error" or "fatal" in the last hour.
Group them by: URL pattern, error message, and status code.
For each group, show: count, first occurrence, last occurrence, affected userIds.
Highlight any group with count > 5 as a potential incident.
Also check if errors correlate with specific IP addresses (possible abuse).

Logs:
[PASTE LOGS HERE]
```

## Prompt 2: Slow Request Analysis

```
Analyze these JSON request logs. Find all requests where duration > 1000ms.
Group slow requests by: URL pattern, method.
For each group, show: median duration, max duration, count, time range.
Identify patterns — are slow requests clustered at certain times?
Are they from specific users or IPs?
Suggest which endpoint needs optimization first.

Logs:
[PASTE LOGS HERE]
```

## Prompt 3: Authentication Attack Detection

```
Analyze these JSON logs for potential authentication attacks.
Look for patterns:
1. Multiple "Login failed" messages from same IP in short time (brute force)
2. Multiple "Registration failed" from same IP (spam)
3. Unusual "Invalid or expired token" spikes (token theft attempt)
4. Requests to /api/auth/* without valid requestId (scripted attack)
Group suspicious activity by IP, show timeline and frequency.
Flag any IP with > 10 failed auth attempts in 5 minutes.

Logs:
[PASTE LOGS HERE]
```

## Prompt 4: Health Check Trend Analysis

```
Analyze these health check logs from /api/health endpoint.
Extract: status, checks.database.responseTime, checks.memory.heapUsed, uptime.
Plot trends:
1. Is database response time increasing over time? (degradation)
2. Is heapUsed growing steadily? (memory leak)
3. Any health check returning "degraded" status? When and why?
4. Correlate degraded status with deployment timestamps if available.
Warn if database response time increased > 50% over the period.

Logs:
[PASTE LOGS HERE]
```

## Prompt 5: User Journey Tracing

```
Trace a specific user's request journey using requestId.
Given a requestId, find ALL log entries with that requestId.
Reconstruct the full request flow: what happened, in what order.
If the request failed, show the exact error and which service produced it.
Also check surrounding requests (same IP, same userId, +-30 seconds)
to understand context.

RequestId: [PASTE REQUEST ID]
Logs:
[PASTE LOGS HERE]
```

## Prompt 6: Daily Health Summary

```
Generate a daily health report from these logs:
1. Total requests: count, success rate (2xx vs 4xx vs 5xx)
2. Top 5 endpoints by request count
3. Top 5 slowest endpoints by average duration
4. Error summary: count by status code and error message
5. Auth summary: registrations, logins (by method: email vs google), failed attempts
6. Database health: average response time from health checks, any degraded periods
7. Notable events: server restarts, memory spikes, rate limit hits

Logs (24 hours):
[PASTE LOGS HERE]
```
