import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../services/categoryService', () => ({
  getCategories: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
}));

vi.mock('../middleware/auth', () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.userId = 'test-user-id';
    next();
  },
  AuthRequest: undefined,
}));

import { authMiddleware } from '../middleware/auth';

import {
  getCategories,
  getCategoriesValidation,
  createCategory,
  createCategoryValidation,
  updateCategory,
  updateCategoryValidation,
  deleteCategory,
  deleteCategoryValidation,
} from '../controllers/categoryController';
import { errorHandler } from '../middleware/errorHandler';
import * as categoryService from '../services/categoryService';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(authMiddleware);
  app.get('/categories', getCategoriesValidation, getCategories);
  app.post('/categories', createCategoryValidation, createCategory);
  app.put('/categories/:id', updateCategoryValidation, updateCategory);
  app.delete('/categories/:id', deleteCategoryValidation, deleteCategory);
  app.use(errorHandler);
  return app;
}

describe('categoryController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /categories', () => {
    it('should return categories list', async () => {
      const categories = [
        { id: '1', name: 'Food', type: 'expense', color: '#EF4444' },
        { id: '2', name: 'Salary', type: 'income', color: '#10B981' },
      ];
      (categoryService.getCategories as ReturnType<typeof vi.fn>).mockResolvedValue(categories);

      const res = await request(createApp()).get('/categories');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(categories);
    });

    it('should filter by type', async () => {
      (categoryService.getCategories as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const res = await request(createApp()).get('/categories?type=expense');

      expect(res.status).toBe(200);
      expect(categoryService.getCategories).toHaveBeenCalledWith('test-user-id', 'expense');
    });

    it('should return 422 for invalid type filter', async () => {
      const res = await request(createApp()).get('/categories?type=invalid');

      expect(res.status).toBe(422);
      expect(res.body.error).toBe('Validation failed');
    });
  });

  describe('POST /categories', () => {
    it('should create a category with valid data', async () => {
      const newCat = { id: '3', name: 'Taxi', type: 'expense', color: '#3B82F6' };
      (categoryService.createCategory as ReturnType<typeof vi.fn>).mockResolvedValue(newCat);

      const res = await request(createApp()).post('/categories').send({
        name: 'Taxi',
        type: 'expense',
        color: '#3B82F6',
      });

      expect(res.status).toBe(201);
      expect(res.body).toEqual(newCat);
      expect(categoryService.createCategory).toHaveBeenCalledWith('test-user-id', 'Taxi', 'expense', '#3B82F6');
    });

    it('should return 422 for missing name', async () => {
      const res = await request(createApp()).post('/categories').send({
        type: 'expense',
        color: '#3B82F6',
      });

      expect(res.status).toBe(422);
    });

    it('should return 422 for invalid type', async () => {
      const res = await request(createApp()).post('/categories').send({
        name: 'Taxi',
        type: 'invalid',
        color: '#3B82F6',
      });

      expect(res.status).toBe(422);
    });

    it('should return 422 for invalid color', async () => {
      const res = await request(createApp()).post('/categories').send({
        name: 'Taxi',
        type: 'expense',
        color: 'red',
      });

      expect(res.status).toBe(422);
    });

    it('should return 422 for name exceeding 30 chars', async () => {
      const res = await request(createApp()).post('/categories').send({
        name: 'A'.repeat(31),
        type: 'expense',
        color: '#3B82F6',
      });

      expect(res.status).toBe(422);
    });
  });

  describe('PUT /categories/:id', () => {
    it('should update a category', async () => {
      const updated = { id: '1', name: 'Groceries', color: '#EF4444' };
      (categoryService.updateCategory as ReturnType<typeof vi.fn>).mockResolvedValue(updated);

      const res = await request(createApp()).put('/categories/00000000-0000-0000-0000-000000000000').send({
        name: 'Groceries',
        color: '#EF4444',
      });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(updated);
    });

    it('should return 422 for invalid id format', async () => {
      const res = await request(createApp()).put('/categories/not-a-uuid').send({
        name: 'Groceries',
      });

      expect(res.status).toBe(422);
    });

    it('should return 404 when category not found', async () => {
      const err = Object.assign(new Error('Category not found'), { status: 404 });
      (categoryService.updateCategory as ReturnType<typeof vi.fn>).mockRejectedValue(err);

      const res = await request(createApp()).put('/categories/00000000-0000-0000-0000-000000000000').send({
        name: 'New',
      });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /categories/:id', () => {
    it('should delete a category', async () => {
      (categoryService.deleteCategory as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const res = await request(createApp()).delete('/categories/00000000-0000-0000-0000-000000000000');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Category deleted');
    });

    it('should return 422 for invalid id format', async () => {
      const res = await request(createApp()).delete('/categories/not-a-uuid');

      expect(res.status).toBe(422);
    });

    it('should return 422 when linked transactions exist', async () => {
      const err = Object.assign(new Error('Cannot delete category: 3 linked transaction(s) exist'), { status: 422 });
      (categoryService.deleteCategory as ReturnType<typeof vi.fn>).mockRejectedValue(err);

      const res = await request(createApp()).delete('/categories/00000000-0000-0000-0000-000000000000');

      expect(res.status).toBe(422);
      expect(res.body.error).toContain('linked transaction');
    });
  });
});
