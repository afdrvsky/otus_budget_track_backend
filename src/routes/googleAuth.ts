import { Router, Request, Response, NextFunction } from 'express';
import passport from '../config/passport';
import { ensureAuthenticated } from '../middleware/ensureAuthenticated';

const router = Router();

router.get('/google', (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

router.get('/google/callback', (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('google', (err: unknown, user: Express.User | false) => {
    if (err) {
      console.error('[Google OAuth] Callback error:', err);
      return next(err);
    }
    if (!user) {
      console.warn('[Google OAuth] No user returned from Google');
      return res.redirect('/login');
    }
    req.logIn(user, (loginErr) => {
      if (loginErr) {
        console.error('[Google OAuth] Login error:', loginErr);
        return next(loginErr);
      }
      res.redirect('/dashboard');
    });
  })(req, res, next);
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
