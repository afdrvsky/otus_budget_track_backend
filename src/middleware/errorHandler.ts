import { Response, Request, NextFunction } from 'express';
import { config } from '../config/env';

export interface AppError extends Error {
  status?: number;
  details?: unknown;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const status = err.status || 500;
  const message = err.message || 'Internal server error';
  const isDev = config.nodeEnv === 'development';

  if (status >= 500) {
    console.error(
      `[${new Date().toISOString()}] ${status} ${_req.method} ${_req.originalUrl}:`,
      err.message,
    );
  }

  res.status(status).json({
    error: status === 500 && !isDev ? 'Internal server error' : message,
    ...(status !== 500 && err.details ? { details: err.details } : {}),
  });
}

export function createError(status: number, message: string, details?: unknown): AppError {
  const err: AppError = new Error(message);
  err.status = status;
  err.details = details;
  return err;
}
