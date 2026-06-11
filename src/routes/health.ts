import { Router, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import logger from '../utils/logger';

const router = Router();

router.get('/', async (_req, res: Response) => {
  const start = Date.now();

  const mem = process.memoryUsage();
  const memory = {
    rss: `${Math.round(mem.rss / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
  };

  let database: { status: string; responseTime?: string; error?: string };

  try {
    const dbStart = Date.now();
    const { error } = await supabaseAdmin.from('profiles').select('id').limit(1);
    const dbResponseTime = Date.now() - dbStart;

    if (error) {
      database = { status: 'error', error: error.message };
      logger.error({ err: error.message }, 'Health check: database unreachable');
    } else {
      database = { status: 'ok', responseTime: `${dbResponseTime}ms` };
    }
  } catch (err: unknown) {
    database = {
      status: 'error',
      error: err instanceof Error ? err.message : 'unknown',
    };
    logger.error({ err }, 'Health check: database connection failed');
  }

  const isDegraded = database.status === 'error';
  const status = isDegraded ? 'degraded' : 'ok';
  const httpStatus = isDegraded ? 503 : 200;

  res.status(httpStatus).json({
    status,
    timestamp: new Date().toISOString(),
    uptime: formatUptime(process.uptime()),
    version: process.env.npm_package_version || '1.0.0',
    responseTime: `${Date.now() - start}ms`,
    checks: { database, memory },
  });
});

router.get('/live', (_req, res: Response) => {
  res.json({ ok: true });
});

router.get('/ready', async (_req, res: Response) => {
  try {
    const { error } = await supabaseAdmin.from('profiles').select('id').limit(1);
    if (error) {
      res.status(503).json({ ok: false, error: error.message });
      return;
    }
    res.json({ ok: true });
  } catch (err: unknown) {
    res.status(503).json({ ok: false, error: err instanceof Error ? err.message : 'unknown' });
  }
});

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0) parts.push(`${mins}m`);
  parts.push(`${secs}s`);
  return parts.join(' ');
}

export default router;
