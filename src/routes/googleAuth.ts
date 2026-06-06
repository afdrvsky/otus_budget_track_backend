import { Router, Request, Response } from 'express';
import { config } from '../config/env';

const router = Router();

router.get('/google', (_req: Request, res: Response) => {
  const supabaseUrl = config.supabaseUrl;
  const redirectUrl = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(`${config.frontendUrl}/auth/callback`)}`;

  res.redirect(redirectUrl);
});

router.get('/google/debug', (_req: Request, res: Response) => {
  const supabaseUrl = config.supabaseUrl;
  const redirectUrl = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(`${config.frontendUrl}/auth/callback`)}`;
  res.json({
    supabaseUrl,
    frontendUrl: config.frontendUrl,
    FRONTEND_URL: process.env.FRONTEND_URL || 'not set',
    redirectUrl,
  });
});

export default router;
