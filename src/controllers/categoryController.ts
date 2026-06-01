import { Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import * as categoryService from '../services/categoryService';

export const getCategoriesValidation = [
  query('type')
    .optional()
    .isIn(['income', 'expense'])
    .withMessage('Type must be income or expense'),
];

export async function getCategories(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError(422, 'Validation failed', errors.array());
    }

    const userId = req.userId!;
    const type = req.query.type as string | undefined;
    const data = await categoryService.getCategories(userId, type);

    res.json(data);
  } catch (err) {
    next(err);
  }
}

export const createCategoryValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 30 })
    .withMessage('Name must be 30 characters or less'),
  body('type').isIn(['income', 'expense']).withMessage('Type must be income or expense'),
  body('color')
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Color must be a valid HEX color'),
];

export async function createCategory(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError(422, 'Validation failed', errors.array());
    }

    const userId = req.userId!;
    const { name, type, color } = req.body;
    const data = await categoryService.createCategory(userId, name, type, color);

    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
}

export const updateCategoryValidation = [
  param('id').isUUID().withMessage('Invalid category ID'),
  body('name').optional().trim().notEmpty().isLength({ max: 30 }),
  body('color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/),
];

export async function updateCategory(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError(422, 'Validation failed', errors.array());
    }

    const userId = req.userId!;
    const id = req.params.id as string;
    const { name, color } = req.body;
    const data = await categoryService.updateCategory(userId, id, name, color);

    res.json(data);
  } catch (err) {
    next(err);
  }
}

export const deleteCategoryValidation = [param('id').isUUID().withMessage('Invalid category ID')];

export async function deleteCategory(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError(422, 'Validation failed', errors.array());
    }

    const userId = req.userId!;
    const id = req.params.id as string;
    await categoryService.deleteCategory(userId, id);

    res.json({ message: 'Category deleted' });
  } catch (err) {
    next(err);
  }
}
