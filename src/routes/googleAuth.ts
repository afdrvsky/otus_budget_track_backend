import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { config } from '../config/env';
import { ensureAuthenticated } from '../middleware/ensureAuthenticated';

const router = Router();

router.get('/google', async (_req: Request, res: Response) => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${config.frontendUrl}/auth/callback`,
    },
  });

  if (error || !data.url) {
    console.error('[Google OAuth] signInWithOAuth error:', error?.message);
    return res.redirect(`${config.frontendUrl}/login#error=server_error`);
  }

  res.redirect(data.url);
});

router.get('/user', ensureAuthenticated, (req: Request, res: Response) => {
  const user = req.user as Express.User;
  res.json({
    id: user.id,
    displayName: user.displayName,
    emails: user.emails,
    photos: user.photos,
    provider: user.provider,
  });
});

export default router;
