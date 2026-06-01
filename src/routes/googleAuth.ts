import { Router, Request, Response, NextFunction } from 'express';
import passport from '../config/passport';
import { ensureAuthenticated } from '../middleware/ensureAuthenticated';

const router = Router();

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('google', {
    failureRedirect: '/login',
    failureMessage: true,
  })(req, res, (err?: unknown) => {
    if (err) {
      return next(err);
    }
    res.redirect('/dashboard');
  });
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
