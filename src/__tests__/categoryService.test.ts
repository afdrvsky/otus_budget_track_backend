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
  const from = vi.fn(() => currentSelf);
  return {
    supabase: { from },
    supabaseAdmin: { from },
  };
});

import * as categoryService from '../services/categoryService';
import { supabaseAdmin } from '../config/supabase';

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

      expect(supabaseAdmin.from).toHaveBeenCalledWith('categories');
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
    it('should delete a custom category with no linked transactions', async () => {
      const category = { id: '1', type: 'expense', is_default: false };

      (supabaseAdmin.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'categories') {
          const catSelf: Record<string, unknown> = {};
          catSelf.select = vi.fn(() => catSelf);
          catSelf.eq = vi.fn(() => catSelf);
          catSelf.single = vi.fn(() => Promise.resolve({ data: category, error: null }));
          catSelf.then = (resolve: (v: unknown) => void) => resolve({ data: null, error: null });
          catSelf.delete = vi.fn(() => catSelf);
          return catSelf;
        }
        // transactions count query
        const countSelf: Record<string, unknown> = {};
        countSelf.select = vi.fn(() => countSelf);
        countSelf.eq = vi.fn(() => countSelf);
        countSelf.then = (resolve: (v: unknown) => void) =>
          resolve({ data: [], error: null, count: 0 });
        return countSelf;
      });

      await categoryService.deleteCategory('u1', '1');

      expect(supabaseAdmin.from).toHaveBeenCalledWith('categories');
    });

    it('should throw 422 when trying to delete a default category', async () => {
      const category = { id: '1', type: 'expense', is_default: true };

      (supabaseAdmin.from as ReturnType<typeof vi.fn>).mockImplementation(() => {
        const catSelf: Record<string, unknown> = {};
        catSelf.select = vi.fn(() => catSelf);
        catSelf.eq = vi.fn(() => catSelf);
        catSelf.single = vi.fn(() => Promise.resolve({ data: category, error: null }));
        return catSelf;
      });

      await expect(categoryService.deleteCategory('u1', '1')).rejects.toThrow(
        'Cannot delete a default category',
      );
    });

    it('should throw 404 when category not found', async () => {
      (supabaseAdmin.from as ReturnType<typeof vi.fn>).mockImplementation(() => {
        const catSelf: Record<string, unknown> = {};
        catSelf.select = vi.fn(() => catSelf);
        catSelf.eq = vi.fn(() => catSelf);
        catSelf.single = vi.fn(() => Promise.resolve({ data: null, error: null }));
        return catSelf;
      });

      await expect(categoryService.deleteCategory('u1', 'missing')).rejects.toThrow(
        'Category not found',
      );
    });

    it('should reassign transactions when reassignTo is provided', async () => {
      const category = { id: '1', type: 'expense', is_default: false };
      const targetCategory = { id: '2', type: 'expense' };

      let callIdx = 0;
      (supabaseAdmin.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        callIdx++;
        if (callIdx === 1) {
          // fetch source category
          const s: Record<string, unknown> = {};
          s.select = vi.fn(() => s);
          s.eq = vi.fn(() => s);
          s.single = vi.fn(() => Promise.resolve({ data: category, error: null }));
          return s;
        }
        if (callIdx === 2) {
          // count transactions
          const s: Record<string, unknown> = {};
          s.select = vi.fn(() => s);
          s.eq = vi.fn(() => s);
          s.then = (resolve: (v: unknown) => void) => resolve({ data: [], error: null, count: 3 });
          return s;
        }
        if (callIdx === 3) {
          // fetch target category
          const s: Record<string, unknown> = {};
          s.select = vi.fn(() => s);
          s.eq = vi.fn(() => s);
          s.single = vi.fn(() => Promise.resolve({ data: targetCategory, error: null }));
          return s;
        }
        if (callIdx === 4) {
          // reassign transactions update
          const s: Record<string, unknown> = {};
          s.update = vi.fn(() => s);
          s.eq = vi.fn(() => s);
          s.then = (resolve: (v: unknown) => void) => resolve({ data: null, error: null });
          return s;
        }
        // delete category
        const s: Record<string, unknown> = {};
        s.delete = vi.fn(() => s);
        s.eq = vi.fn(() => s);
        s.then = (resolve: (v: unknown) => void) => resolve({ data: null, error: null });
        return s;
      });

      await categoryService.deleteCategory('u1', '1', '2');

      expect(supabaseAdmin.from).toHaveBeenCalledWith('categories');
    });

    it('should throw 422 when reassign target has different type', async () => {
      const category = { id: '1', type: 'expense', is_default: false };
      const targetCategory = { id: '2', type: 'income' };

      let callIdx = 0;
      (supabaseAdmin.from as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callIdx++;
        if (callIdx === 1) {
          const s: Record<string, unknown> = {};
          s.select = vi.fn(() => s);
          s.eq = vi.fn(() => s);
          s.single = vi.fn(() => Promise.resolve({ data: category, error: null }));
          return s;
        }
        if (callIdx === 2) {
          const s: Record<string, unknown> = {};
          s.select = vi.fn(() => s);
          s.eq = vi.fn(() => s);
          s.then = (resolve: (v: unknown) => void) => resolve({ data: [], error: null, count: 2 });
          return s;
        }
        const s: Record<string, unknown> = {};
        s.select = vi.fn(() => s);
        s.eq = vi.fn(() => s);
        s.single = vi.fn(() => Promise.resolve({ data: targetCategory, error: null }));
        return s;
      });

      await expect(categoryService.deleteCategory('u1', '1', '2')).rejects.toThrow(
        'Cannot reassign transactions to a category of a different type',
      );
    });

    it('should throw 422 when category has transactions and no reassignTo', async () => {
      const category = { id: '1', type: 'expense', is_default: false };

      let callIdx = 0;
      (supabaseAdmin.from as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callIdx++;
        if (callIdx === 1) {
          const s: Record<string, unknown> = {};
          s.select = vi.fn(() => s);
          s.eq = vi.fn(() => s);
          s.single = vi.fn(() => Promise.resolve({ data: category, error: null }));
          return s;
        }
        const s: Record<string, unknown> = {};
        s.select = vi.fn(() => s);
        s.eq = vi.fn(() => s);
        s.then = (resolve: (v: unknown) => void) => resolve({ data: [], error: null, count: 5 });
        return s;
      });

      await expect(categoryService.deleteCategory('u1', '1')).rejects.toThrow(
        'Cannot delete category: 5 linked transaction(s) exist',
      );
    });
  });
});
