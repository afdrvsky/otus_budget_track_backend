import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockChain = {
  data: null as unknown,
  error: null as unknown,
  _select: vi.fn(),
  _insert: vi.fn(),
  _update: vi.fn(),
  _delete: vi.fn(),
  _eq: vi.fn(),
  _order: vi.fn(),
  _single: vi.fn(),
};

function resetChain() {
  Object.keys(mockChain).forEach((k) => {
    if (typeof mockChain[k as keyof typeof mockChain] === 'function') {
      (mockChain[k as keyof typeof mockChain] as ReturnType<typeof vi.fn>).mockReset();
    }
  });
  mockChain.data = null;
  mockChain.error = null;
}

function makeChain() {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const methods = [
    'select',
    'insert',
    'update',
    'delete',
    'eq',
    'order',
    'single',
    'select_star_head_count',
  ];

  const self: Record<string, unknown> = {};

  for (const m of methods) {
    chain[m] = vi.fn(() => self);
  }

  // select with options (for count)
  chain['select_star_head_count'] = vi.fn(() => self);

  // single returns a promise
  chain.single.mockImplementation(() =>
    Promise.resolve({ data: mockChain.data, error: mockChain.error }),
  );

  // The chain itself is thenable
  self.then = (resolve: (v: unknown) => void) =>
    resolve({ data: mockChain.data, error: mockChain.error });
  self.catch = () => Promise.resolve({ data: mockChain.data, error: mockChain.error });

  // Wire up methods
  for (const m of methods) {
    self[m] = chain[m];
  }
  // Alias for select('*', { count: 'exact', head: true })
  self.select = chain.select;

  return { chain, self };
}

let currentSelf: Record<string, unknown>;

vi.mock('../config/supabase', () => {
  return {
    supabase: {
      from: vi.fn(() => currentSelf),
    },
  };
});

import * as categoryService from '../services/categoryService';
import { supabase } from '../config/supabase';

describe('categoryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetChain();
  });

  describe('getCategories', () => {
    it('should fetch all categories for a user', async () => {
      const categories = [
        { id: '1', user_id: 'u1', name: 'Food', type: 'expense', color: '#EF4444' },
        { id: '2', user_id: 'u1', name: 'Salary', type: 'income', color: '#10B981' },
      ];
      mockChain.data = categories;
      mockChain.error = null;

      const { self } = makeChain();
      currentSelf = self;

      const result = await categoryService.getCategories('u1');

      expect(supabase.from).toHaveBeenCalledWith('categories');
      expect(result).toEqual(categories);
    });

    it('should filter categories by type', async () => {
      mockChain.data = [{ id: '1', name: 'Food', type: 'expense' }];
      mockChain.error = null;

      const { self, chain } = makeChain();
      currentSelf = self;

      const result = await categoryService.getCategories('u1', 'expense');

      expect(chain.eq).toHaveBeenCalledWith('type', 'expense');
      expect(result).toEqual(mockChain.data);
    });

    it('should throw on fetch error', async () => {
      mockChain.data = null;
      mockChain.error = { message: 'DB error' };

      const { self } = makeChain();
      currentSelf = self;

      await expect(categoryService.getCategories('u1')).rejects.toThrow(
        'Failed to fetch categories',
      );
    });
  });

  describe('createCategory', () => {
    it('should create a category and return it', async () => {
      const newCat = {
        id: '3',
        user_id: 'u1',
        name: 'Taxi',
        type: 'expense',
        color: '#3B82F6',
        is_default: false,
      };
      mockChain.data = newCat;
      mockChain.error = null;

      const { self, chain } = makeChain();
      currentSelf = self;

      const result = await categoryService.createCategory('u1', 'Taxi', 'expense', '#3B82F6');

      expect(chain.insert).toHaveBeenCalledWith({
        user_id: 'u1',
        name: 'Taxi',
        type: 'expense',
        color: '#3B82F6',
        is_default: false,
      });
      expect(result).toEqual(newCat);
    });

    it('should throw 422 on duplicate category (unique violation)', async () => {
      mockChain.data = null;
      mockChain.error = { code: '23505', message: 'duplicate' };

      const { self } = makeChain();
      currentSelf = self;

      await expect(
        categoryService.createCategory('u1', 'Food', 'expense', '#EF4444'),
      ).rejects.toThrow('Category "Food" already exists for type "expense"');
    });

    it('should throw 500 on other insert errors', async () => {
      mockChain.data = null;
      mockChain.error = { code: 'XXXXX', message: 'some error' };

      const { self } = makeChain();
      currentSelf = self;

      await expect(
        categoryService.createCategory('u1', 'Food', 'expense', '#EF4444'),
      ).rejects.toThrow('Failed to create category');
    });
  });

  describe('updateCategory', () => {
    it('should update a category', async () => {
      const updated = { id: '1', name: 'Groceries', color: '#EF4444' };
      mockChain.data = updated;
      mockChain.error = null;

      const { self, chain } = makeChain();
      currentSelf = self;

      const result = await categoryService.updateCategory('u1', '1', 'Groceries', '#EF4444');

      expect(chain.update).toHaveBeenCalled();
      expect(result).toEqual(updated);
    });

    it('should throw 404 when category not found', async () => {
      mockChain.data = null;
      mockChain.error = null;

      const { self } = makeChain();
      currentSelf = self;

      await expect(categoryService.updateCategory('u1', 'nonexistent', 'New')).rejects.toThrow(
        'Category not found',
      );
    });

    it('should throw 422 on duplicate name (unique violation)', async () => {
      mockChain.data = null;
      mockChain.error = { code: '23505', message: 'duplicate' };

      const { self } = makeChain();
      currentSelf = self;

      await expect(categoryService.updateCategory('u1', '1', 'Existing')).rejects.toThrow(
        'Category "Existing" already exists',
      );
    });
  });

  describe('deleteCategory', () => {
    it('should delete a category with no linked transactions', async () => {
      mockChain.data = null;
      mockChain.error = null;

      const { self } = makeChain();
      // First call (count check) returns 0 transactions
      let callCount = 0;
      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // transactions count query
          const countSelf: Record<string, unknown> = {};
          countSelf.then = (resolve: (v: unknown) => void) =>
            resolve({ data: [], error: null, count: 0 });
          countSelf.select = vi.fn(() => countSelf);
          countSelf.eq = vi.fn(() => countSelf);
          return countSelf;
        }
        return self;
      });

      await categoryService.deleteCategory('u1', '1');

      // Should reach the delete call
      expect(supabase.from).toHaveBeenCalledWith('categories');
    });

    it('should throw 422 when linked transactions exist', async () => {
      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => {
        const countSelf: Record<string, unknown> = {};
        countSelf.then = (resolve: (v: unknown) => void) =>
          resolve({ data: [], error: null, count: 5 });
        countSelf.select = vi.fn(() => countSelf);
        countSelf.eq = vi.fn(() => countSelf);
        return countSelf;
      });

      await expect(categoryService.deleteCategory('u1', '1')).rejects.toThrow(
        'Cannot delete category: 5 linked transaction(s) exist',
      );
    });
  });
});
