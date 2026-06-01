import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../config/supabase', () => {
  const auth = {
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    admin: { signOut: vi.fn() },
    resetPasswordForEmail: vi.fn(),
  };
  return { supabase: { auth } };
});

import * as authService from '../services/authService';
import { supabase } from '../config/supabase';

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('should register a user and return data', async () => {
      const mockData = { user: { id: '1', email: 'test@test.com' }, session: {} };
      (supabase.auth.signUp as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await authService.register('test@test.com', '123456', 'Test User');

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@test.com',
        password: '123456',
        options: { data: { full_name: 'Test User' } },
      });
      expect(result).toEqual(mockData);
    });

    it('should throw on signUp error', async () => {
      (supabase.auth.signUp as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: null,
        error: { message: 'User already registered' },
      });

      await expect(authService.register('test@test.com', '123456')).rejects.toThrow(
        'User already registered',
      );
    });

    it('should register without full_name', async () => {
      const mockData = { user: { id: '1' }, session: {} };
      (supabase.auth.signUp as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await authService.register('test@test.com', '123456');

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@test.com',
        password: '123456',
        options: { data: { full_name: undefined } },
      });
      expect(result).toEqual(mockData);
    });
  });

  describe('login', () => {
    it('should login and return data', async () => {
      const mockData = { user: { id: '1' }, session: { access_token: 'tok' } };
      (supabase.auth.signInWithPassword as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await authService.login('test@test.com', '123456');

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@test.com',
        password: '123456',
      });
      expect(result).toEqual(mockData);
    });

    it('should throw 401 on invalid credentials', async () => {
      (supabase.auth.signInWithPassword as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: null,
        error: { message: 'Invalid credentials' },
      });

      await expect(authService.login('test@test.com', 'wrong')).rejects.toThrow(
        'Invalid email or password',
      );
    });
  });

  describe('logout', () => {
    it('should sign out with token', async () => {
      (supabase.auth.admin.signOut as ReturnType<typeof vi.fn>).mockResolvedValue({ error: null });

      await authService.logout('valid-token');

      expect(supabase.auth.admin.signOut).toHaveBeenCalledWith('valid-token');
    });

    it('should throw on logout error', async () => {
      (supabase.auth.admin.signOut as ReturnType<typeof vi.fn>).mockResolvedValue({
        error: { message: 'Failed' },
      });

      await expect(authService.logout('bad-token')).rejects.toThrow('Failed to logout');
    });
  });

  describe('recoverPassword', () => {
    it('should send recovery email', async () => {
      (supabase.auth.resetPasswordForEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
        error: null,
      });

      await authService.recoverPassword('test@test.com');

      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('test@test.com');
    });

    it('should throw on recovery error', async () => {
      (supabase.auth.resetPasswordForEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
        error: { message: 'Rate limit exceeded' },
      });

      await expect(authService.recoverPassword('test@test.com')).rejects.toThrow(
        'Rate limit exceeded',
      );
    });
  });
});
