import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';

vi.mock('../services/authService', () => ({
  register: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  recoverPassword: vi.fn(),
}));

import {
  register,
  registerValidation,
  login,
  loginValidation,
  logout,
  recoverPassword,
  recoverValidation,
} from '../controllers/authController';
import { errorHandler } from '../middleware/errorHandler';
import * as authService from '../services/authService';

function createApp() {
  const app = express();
  app.use(express.json());
  app.post('/register', registerValidation, register);
  app.post('/login', loginValidation, login);
  app.post('/logout', logout);
  app.post('/recover', recoverValidation, recoverPassword);
  app.use(errorHandler);
  return app;
}

import request from 'supertest';

describe('authController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /register', () => {
    it('should register a user with valid data', async () => {
      const mockData = { user: { id: '1', email: 'test@test.com' }, session: {} };
      (authService.register as ReturnType<typeof vi.fn>).mockResolvedValue(mockData);

      const app = createApp();
      const res = await request(app).post('/register').send({
        email: 'test@test.com',
        password: 'ValidP@ssw0rd',
        full_name: 'Test User',
      });

      expect(res.status).toBe(201);
      expect(res.body).toEqual(mockData);
      expect(authService.register).toHaveBeenCalledWith(
        'test@test.com',
        'ValidP@ssw0rd',
        'Test User',
      );
    });

    it('should return 422 for invalid email', async () => {
      const app = createApp();
      const res = await request(app).post('/register').send({
        email: 'not-an-email',
        password: '[PASSWORD_254474]',
      });

      expect(res.status).toBe(422);
      expect(res.body.error).toBe('Validation failed');
    });

    it('should return 422 for short password', async () => {
      const app = createApp();
      const res = await request(app).post('/register').send({
        email: 'test@test.com',
        password: 'Ab1!',
      });

      expect(res.status).toBe(422);
      expect(res.body.error).toBe('Validation failed');
    });

    it('should return 422 when service throws', async () => {
      (authService.register as ReturnType<typeof vi.fn>).mockRejectedValue(
        Object.assign(new Error('Registration failed. Please check your data and try again.'), {
          status: 422,
        }),
      );

      const app = createApp();
      const res = await request(app).post('/register').send({
        email: 'test@test.com',
        password: 'Str0ng!Pass',
      });

      expect(res.status).toBe(422);
      expect(res.body.error).toBe('Registration failed. Please check your data and try again.');
    });
  });

  describe('POST /login', () => {
    it('should login with valid credentials', async () => {
      const mockData = { user: { id: '1' }, session: { access_token: 'tok' } };
      (authService.login as ReturnType<typeof vi.fn>).mockResolvedValue(mockData);

      const app = createApp();
      const res = await request(app).post('/login').send({
        email: 'test@test.com',
        password: '[PASSWORD_764718]',
      });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockData);
    });

    it('should return 422 for missing email', async () => {
      const app = createApp();
      const res = await request(app).post('/login').send({
        password: '[PASSWORD_764718]',
      });

      expect(res.status).toBe(422);
    });

    it('should return 422 for missing password', async () => {
      const app = createApp();
      const res = await request(app).post('/login').send({
        email: 'test@test.com',
      });

      expect(res.status).toBe(422);
    });
  });

  describe('POST /logout', () => {
    it('should return 401 without token', async () => {
      const app = createApp();
      const res = await request(app).post('/logout');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /recover', () => {
    it('should send recovery email for valid email', async () => {
      (authService.recoverPassword as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const app = createApp();
      const res = await request(app).post('/recover').send({
        email: 'test@test.com',
      });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Password recovery email sent');
    });

    it('should return 422 for invalid email', async () => {
      const app = createApp();
      const res = await request(app).post('/recover').send({
        email: 'not-an-email',
      });

      expect(res.status).toBe(422);
    });
  });
});
