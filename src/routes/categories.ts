import { Router } from 'express';
import {
  getCategories, getCategoriesValidation,
  createCategory, createCategoryValidation,
  updateCategory, updateCategoryValidation,
  deleteCategory, deleteCategoryValidation,
} from '../controllers/categoryController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', getCategoriesValidation, getCategories);
router.post('/', createCategoryValidation, createCategory);
router.put('/:id', updateCategoryValidation, updateCategory);
router.delete('/:id', deleteCategoryValidation, deleteCategory);

export default router;
