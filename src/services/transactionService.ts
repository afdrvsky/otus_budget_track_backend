import { supabase } from '../config/supabase';
import { createError } from '../middleware/errorHandler';
import { Transaction } from '../types/index';

interface TransactionFilters {
  type?: string;
  categoryId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export async function getTransactions(
  userId: string,
  filters: TransactionFilters
): Promise<Transaction[]> {
  let query = supabase
    .from('transactions')
    .select('*, categories(id, name, type, color)')
    .eq('user_id', userId)
    .order('transaction_date', { ascending: false });

  if (filters.type) {
    query = query.eq('type', filters.type);
  }
  if (filters.categoryId) {
    query = query.eq('category_id', filters.categoryId);
  }
  if (filters.dateFrom) {
    query = query.gte('transaction_date', filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte('transaction_date', filters.dateTo);
  }

  const { data, error } = await query;

  if (error) {
    throw createError(500, 'Failed to fetch transactions');
  }

  return data;
}

export async function createTransaction(
  userId: string,
  categoryId: string,
  amount: number,
  type: string,
  transactionDate: string,
  comment?: string
): Promise<Transaction> {
  // Verify category belongs to user and matches transaction type
  const { data: category } = await supabase
    .from('categories')
    .select('id, type')
    .eq('id', categoryId)
    .eq('user_id', userId)
    .single();

  if (!category) {
    throw createError(404, 'Category not found');
  }
  if (category.type !== type) {
    throw createError(422, `Category type "${category.type}" does not match transaction type "${type}"`);
  }

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      category_id: categoryId,
      amount,
      type,
      transaction_date: transactionDate,
      comment: comment || null,
    })
    .select('*, categories(id, name, type, color)')
    .single();

  if (error) {
    throw createError(500, 'Failed to create transaction');
  }

  return data;
}

export async function updateTransaction(
  userId: string,
  transactionId: string,
  updates: {
    categoryId?: string;
    amount?: number;
    type?: string;
    comment?: string;
    transactionDate?: string;
  }
): Promise<Transaction> {
  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.categoryId !== undefined) updateData.category_id = updates.categoryId;
  if (updates.amount !== undefined) updateData.amount = updates.amount;
  if (updates.type !== undefined) updateData.type = updates.type;
  if (updates.comment !== undefined) updateData.comment = updates.comment;
  if (updates.transactionDate !== undefined) updateData.transaction_date = updates.transactionDate;

  const { data, error } = await supabase
    .from('transactions')
    .update(updateData)
    .eq('id', transactionId)
    .eq('user_id', userId)
    .select('*, categories(id, name, type, color)')
    .single();

  if (error) {
    throw createError(500, 'Failed to update transaction');
  }

  if (!data) {
    throw createError(404, 'Transaction not found');
  }

  return data;
}

export async function deleteTransaction(userId: string, transactionId: string): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', transactionId)
    .eq('user_id', userId);

  if (error) {
    throw createError(500, 'Failed to delete transaction');
  }
}
