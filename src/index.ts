import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { authLimiter, generalLimiter } from './middleware/rateLimiter';
import { requestLogger } from './middleware/requestLogger';
import { requestId } from './utils/requestId';
import logger from './utils/logger';
import authRoutes from './routes/auth';
import categoryRoutes from './routes/categories';
import transactionRoutes from './routes/transactions';
import googleAuthRoutes from './routes/googleAuth';
import healthRoutes from './routes/health';

import { authMiddleware } from './middleware/auth';
import { getCurrentUser } from './services/authService';

const app = express();

app.set('trust proxy', 1);

app.use(helmet());
app.use(
  cors({
    origin: config.corsOrigin ? config.corsOrigin.split(',').map((s) => s.trim()) : false,
    credentials: true,
  }),
);
app.use(express.json({ limit: '10kb' }));
app.use(requestId);
app.use(requestLogger);

app.use('/api/health', healthRoutes);

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/auth', googleAuthRoutes);
app.use('/api', generalLimiter);
app.use('/api/categories', categoryRoutes);
app.use('/api/transactions', transactionRoutes);

app.get('/api/user', authMiddleware, async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const user = await getCurrentUser(token!);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

app.get('/dashboard', (_req, res) => {
  res.json({ message: 'Dashboard — authenticated area' });
});

app.get('/login', (_req, res) => {
  res.status(401).json({ error: 'Login required' });
});

app.use(errorHandler);

app.listen(config.port, () => {
  logger.info({ port: config.port, env: config.nodeEnv }, 'Server started');
});

export default app;
