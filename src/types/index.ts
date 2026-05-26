export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  category_id: string;
  amount: number;
  type: 'income' | 'expense';
  comment: string | null;
  transaction_date: string;
  created_at: string;
  updated_at: string;
}

export interface AuthRequest extends Request {
  userId?: string;
}

export interface ApiError {
  status: number;
  message: string;
  details?: unknown;
}
