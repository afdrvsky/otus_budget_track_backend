import { Response, Request, NextFunction } from 'express';
import { config } from '../config/env';
import logger from '../utils/logger';

export interface AppError extends Error {
  status?: number;
  details?: unknown;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const status = err.status || 500;
  const message = err.message || 'Internal server error';
  const isDev = config.nodeEnv === 'development';

  const logContext = {
    requestId: req.id,
    method: req.method,
    url: req.originalUrl,
    status,
    err,
  };

  if (status >= 500) {
    logger.error(logContext, message);
  } else {
    logger.warn(logContext, message);
  }

  res.status(status).json({
    error: status === 500 && !isDev ? 'Internal server error' : message,
    requestId: req.id,
    ...(status !== 500 && err.details ? { details: err.details } : {}),
  });
}

export function createError(status: number, message: string, details?: unknown): AppError {
  const err: AppError = new Error(message);
  err.status = status;
  err.details = details;
  return err;
}
