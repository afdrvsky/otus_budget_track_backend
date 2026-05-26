import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';

vi.mock('../config/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
  },
}));

import { authMiddleware, AuthRequest } from '../middleware/auth';
import { supabase } from '../config/supabase';

function mockRes() {
  const res: Partial<Response> = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res as Response;
}

describe('authMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should set userId and call next for valid token', async () => {
    const req = {
      headers: { authorization: 'Bearer valid-token' },
    } as Partial<Request>;
    const res = mockRes();
    const next = vi.fn();

    (supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    await authMiddleware(req as AuthRequest, res, next);

    expect((req as AuthRequest).userId).toBe('user-1');
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should return 401 when no authorization header', async () => {
    const req = { headers: {} } as Partial<Request>;
    const res = mockRes();
    const next = vi.fn();

    await authMiddleware(req as AuthRequest, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing or invalid authorization header' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when authorization header does not start with Bearer', async () => {
    const req = {
      headers: { authorization: 'Basic dXNlcjpwYXNz' },
    } as Partial<Request>;
    const res = mockRes();
    const next = vi.fn();

    await authMiddleware(req as AuthRequest, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing or invalid authorization header' });
  });

  it('should return 401 for invalid/expired token', async () => {
    const req = {
      headers: { authorization: 'Bearer bad-token' },
    } as Partial<Request>;
    const res = mockRes();
    const next = vi.fn();

    (supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid token' },
    });

    await authMiddleware(req as AuthRequest, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });
});
