import { supabaseAdmin } from '../config/supabase';
import { createError } from '../middleware/errorHandler';
import logger from '../utils/logger';
import { Transaction } from '../types/index';

interface TransactionFilters {
  type?: string;
  categoryId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export async function getTransactions(
  userId: string,
  filters: TransactionFilters,
): Promise<Transaction[]> {
  let query = supabaseAdmin
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
    logger.error({ err: error.message, userId, filters }, 'Failed to fetch transactions');
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
  comment?: string,
): Promise<Transaction> {
  const { data: category } = await supabaseAdmin
    .from('categories')
    .select('id, type')
    .eq('id', categoryId)
    .eq('user_id', userId)
    .single();

  if (!category) {
    throw createError(404, 'Category not found');
  }
  if (category.type !== type) {
    throw createError(
      422,
      `Category type "${category.type}" does not match transaction type "${type}"`,
    );
  }

  const { data, error } = await supabaseAdmin
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
    logger.error({ err: error.message, userId, type, categoryId }, 'Failed to create transaction');
    throw createError(500, 'Failed to create transaction');
  }

  logger.info({ userId, transactionId: data.id, type, amount }, 'Transaction created');
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
  },
): Promise<Transaction> {
  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (updates.categoryId !== undefined) {
    const { data: category } = await supabaseAdmin
      .from('categories')
      .select('id, type')
      .eq('id', updates.categoryId)
      .eq('user_id', userId)
      .single();

    if (!category) {
      throw createError(404, 'Category not found');
    }

    if (updates.type !== undefined && category.type !== updates.type) {
      throw createError(
        422,
        `Category type "${category.type}" does not match transaction type "${updates.type}"`,
      );
    }

    updateData.category_id = updates.categoryId;
  }

  if (updates.type !== undefined) {
    if (updates.categoryId === undefined) {
      const { data: transaction } = await supabaseAdmin
        .from('transactions')
        .select('category_id')
        .eq('id', transactionId)
        .eq('user_id', userId)
        .single();

      if (transaction) {
        const { data: existingCategory } = await supabaseAdmin
          .from('categories')
          .select('type')
          .eq('id', transaction.category_id)
          .eq('user_id', userId)
          .single();

        if (existingCategory && existingCategory.type !== updates.type) {
          throw createError(
            422,
            `Current category type "${existingCategory.type}" does not match new transaction type "${updates.type}"`,
          );
        }
      }
    }
    updateData.type = updates.type;
  }

  if (updates.amount !== undefined) updateData.amount = updates.amount;
  if (updates.comment !== undefined) updateData.comment = updates.comment;
  if (updates.transactionDate !== undefined) updateData.transaction_date = updates.transactionDate;

  const { data, error } = await supabaseAdmin
    .from('transactions')
    .update(updateData)
    .eq('id', transactionId)
    .eq('user_id', userId)
    .select('*, categories(id, name, type, color)')
    .single();

  if (error) {
    logger.error({ err: error.message, userId, transactionId }, 'Failed to update transaction');
    throw createError(500, 'Failed to update transaction');
  }

  if (!data) {
    throw createError(404, 'Transaction not found');
  }

  logger.info({ userId, transactionId }, 'Transaction updated');
  return data;
}

export async function deleteTransaction(userId: string, transactionId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('transactions')
    .delete()
    .eq('id', transactionId)
    .eq('user_id', userId);

  if (error) {
    logger.error({ err: error.message, userId, transactionId }, 'Failed to delete transaction');
    throw createError(500, 'Failed to delete transaction');
  }

  logger.info({ userId, transactionId }, 'Transaction deleted');
}
