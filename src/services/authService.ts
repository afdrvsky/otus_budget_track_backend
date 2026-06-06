import { supabase, supabaseAdmin } from '../config/supabase';
import { createError } from '../middleware/errorHandler';

export async function register(email: string, password: string, fullName?: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  });

  if (error) {
    throw createError(422, 'Registration failed. Please check your data and try again.');
  }

  return data;
}

export async function login(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    throw createError(401, 'Invalid email or password');
  }

  return data;
}

export async function logout(token: string) {
  const { error } = await supabaseAdmin.auth.admin.signOut(token);

  if (error) {
    throw createError(500, 'Failed to logout');
  }
}

export async function getCurrentUser(token: string) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
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
    throw createError(422, 'Unable to send recovery email. Please try again.');
  }
}
