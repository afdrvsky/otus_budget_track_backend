import { supabase } from '../config/supabase';
import { createError } from '../middleware/errorHandler';
import { Category } from '../types/index';

export async function getCategories(userId: string, type?: string): Promise<Category[]> {
  let query = supabase
    .from('categories')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (type) {
    query = query.eq('type', type);
  }

  const { data, error } = await query;

  if (error) {
    throw createError(500, 'Failed to fetch categories');
  }

  return data;
}

export async function createCategory(
  userId: string,
  name: string,
  type: string,
  color: string
): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .insert({ user_id: userId, name, type, color, is_default: false })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw createError(422, `Category "${name}" already exists for type "${type}"`);
    }
    throw createError(500, 'Failed to create category');
  }

  return data;
}

export async function updateCategory(
  userId: string,
  categoryId: string,
  name?: string,
  color?: string
): Promise<Category> {
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (name !== undefined) updates.name = name;
  if (color !== undefined) updates.color = color;

  const { data, error } = await supabase
    .from('categories')
    .update(updates)
    .eq('id', categoryId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw createError(422, `Category "${name}" already exists`);
    }
    throw createError(500, 'Failed to update category');
  }

  if (!data) {
    throw createError(404, 'Category not found');
  }

  return data;
}

export async function deleteCategory(userId: string, categoryId: string): Promise<void> {
  // Check for linked transactions
  const { count } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', categoryId);

  if (count && count > 0) {
    throw createError(422, `Cannot delete category: ${count} linked transaction(s) exist. Reassign them first.`);
  }

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', categoryId)
    .eq('user_id', userId);

  if (error) {
    throw createError(500, 'Failed to delete category');
  }
}
