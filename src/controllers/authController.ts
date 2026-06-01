import { Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import * as authService from '../services/authService';

export const registerValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain an uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain a lowercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain a number')
    .matches(/[^A-Za-z0-9]/)
    .withMessage('Password must contain a special character'),
  body('full_name').optional().trim().isLength({ max: 100 }),
];

export async function register(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError(422, 'Validation failed', errors.array());
    }

    const { email, password, full_name } = req.body;
    const data = await authService.register(email, password, full_name);

    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
}

export const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

export async function login(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError(422, 'Validation failed', errors.array());
    }

    const { email, password } = req.body;
    const data = await authService.login(email, password);

    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function logout(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw createError(401, 'No token provided');
    }

    await authService.logout(token);
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
}

export const recoverValidation = [body('email').isEmail().withMessage('Valid email is required')];

export async function recoverPassword(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError(422, 'Validation failed', errors.array());
    }

    const { email } = req.body;
    await authService.recoverPassword(email);

    res.json({ message: 'Password recovery email sent' });
  } catch (err) {
    next(err);
  }
}
