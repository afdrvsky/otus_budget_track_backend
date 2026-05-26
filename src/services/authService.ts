import { supabase } from '../config/supabase';
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
    throw createError(422, error.message);
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
  const { error } = await supabase.auth.admin.signOut(token);

  if (error) {
    throw createError(500, 'Failed to logout');
  }
}

export async function recoverPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email);

  if (error) {
    throw createError(422, error.message);
  }
}
