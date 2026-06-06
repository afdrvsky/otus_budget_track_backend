import dotenv from 'dotenv';
dotenv.config();

function clean(val: string | undefined, fallback = ''): string {
  return (val || fallback).replace(/[\r\n]+/g, '').trim();
}

export const config = {
  port: parseInt(process.env.PORT || '8080', 10),
  nodeEnv: (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test',
  supabaseUrl: clean(process.env.SUPABASE_URL),
  supabaseAnonKey: clean(process.env.SUPABASE_ANON_KEY),
  supabaseServiceRoleKey: clean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  corsOrigin: clean(process.env.CORS_ORIGIN),
  sessionSecret: clean(process.env.SESSION_SECRET, 'change-me-in-production'),
  googleClientId: clean(process.env.GOOGLE_CLIENT_ID),
  googleClientSecret: clean(process.env.GOOGLE_CLIENT_SECRET),
  frontendUrl: clean(process.env.FRONTEND_URL, 'http://localhost:3000'),
};
