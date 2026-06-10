import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const ctx = {
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };

    if (res.statusCode >= 500) {
      logger.error(ctx, 'Request completed with server error');
    } else if (res.statusCode >= 400) {
      logger.warn(ctx, 'Request completed with client error');
    } else {
      logger.info(ctx, 'Request completed');
    }
  });

  next();
}
