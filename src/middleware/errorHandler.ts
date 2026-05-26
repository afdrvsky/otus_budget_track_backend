import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  status?: number;
  details?: unknown;
}

export function errorHandler(err: AppError, _req: Request, res: Response, _next: NextFunction): void {
  const status = err.status || 500;
  const message = err.message || 'Internal server error';

  res.status(status).json({
    error: message,
    ...(err.details ? { details: err.details } : {}),
  });
}

export function createError(status: number, message: string, details?: unknown): AppError {
  const err: AppError = new Error(message);
  err.status = status;
  err.details = details;
  return err;
}
