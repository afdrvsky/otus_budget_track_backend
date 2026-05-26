import { Router } from 'express';
import {
  register, registerValidation,
  login, loginValidation,
  logout,
  recoverPassword, recoverValidation,
} from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/logout', authMiddleware, logout);
router.post('/recover', recoverValidation, recoverPassword);

export default router;
