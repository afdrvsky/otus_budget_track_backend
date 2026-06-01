import { describe, it, expect, vi } from 'vitest';
import { errorHandler, createError, AppError } from '../middleware/errorHandler';
import { Request, Response } from 'express';

function mockRes() {
  const res: Partial<Response> = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res as Response;
}

describe('errorHandler', () => {
  it('should return generic message for 500 errors in non-development mode', () => {
    const err = new Error('Something went wrong') as AppError;
    const req = { method: 'GET', originalUrl: '/test' } as Request;
    const res = mockRes();
    const next = vi.fn();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
  });

  it('should return the error status and message for non-500 errors', () => {
    const err = createError(422, 'Validation failed', [{ field: 'email' }]);

    const req = { method: 'POST', originalUrl: '/register' } as Request;
    const res = mockRes();
    const next = vi.fn();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Validation failed',
      details: [{ field: 'email' }],
    });
  });

  it('should not include details when not provided', () => {
    const err = createError(404, 'Not found');

    const req = { method: 'GET', originalUrl: '/categories/1' } as Request;
    const res = mockRes();
    const next = vi.fn();

    errorHandler(err, req, res, next);

    expect(res.json).toHaveBeenCalledWith({ error: 'Not found' });
  });
});

describe('createError', () => {
  it('should create an error with status and details', () => {
    const err = createError(400, 'Bad request', { field: 'id' });

    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('Bad request');
    expect(err.status).toBe(400);
    expect(err.details).toEqual({ field: 'id' });
  });
});
