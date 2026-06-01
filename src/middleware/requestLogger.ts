import { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'INFO';
    const logFn = level === 'ERROR' ? console.error : level === 'WARN' ? console.warn : console.log;

    if (res.statusCode >= 400) {
      logFn(
        `[${new Date().toISOString()}] ${level} ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms ip=${req.ip}`,
      );
    }
  });

  next();
}
