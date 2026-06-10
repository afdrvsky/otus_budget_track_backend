import { supabase, supabaseAdmin } from '../config/supabase';
import { createError } from '../middleware/errorHandler';
import logger from '../utils/logger';

export async function register(email: string, password: string, fullName?: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  });

  if (error) {
    logger.warn({ email, supabaseCode: error.code, err: error.message }, 'Registration failed');
    throw createError(422, 'Registration failed. Please check your data and try again.');
  }

  logger.info({ userId: data.user?.id }, 'User registered');
  return data;
}

export async function login(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    logger.warn({ email, supabaseCode: error.code }, 'Login failed');
    throw createError(401, 'Invalid email or password');
  }

  logger.info({ userId: data.user?.id }, 'User logged in');
  return data;
}

export async function logout(token: string) {
  const { error } = await supabaseAdmin.auth.admin.signOut(token);

  if (error) {
    logger.error({ err: error.message }, 'Logout failed');
    throw createError(500, 'Failed to logout');
  }
}

export async function getCurrentUser(token: string) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    logger.debug({ err: error?.message }, 'Get current user failed');
    throw createError(401, 'Invalid or expired token');
  }

  return {
    id: user.id,
    email: user.email ?? '',
    user_metadata: user.user_metadata,
    name: user.user_metadata?.full_name,
    avatar_url: user.user_metadata?.avatar_url,
  };
}

export async function recoverPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email);

  if (error) {
    logger.warn({ email, err: error.message }, 'Password recovery failed');
    throw createError(422, 'Unable to send recovery email. Please try again.');
  }

  logger.info({ email }, 'Password recovery email sent');
}
