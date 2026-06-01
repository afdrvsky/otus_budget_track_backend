import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import { config } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { authLimiter, generalLimiter } from './middleware/rateLimiter';
import { requestLogger } from './middleware/requestLogger';
import { configurePassport, default as passport } from './config/passport';
import authRoutes from './routes/auth';
import categoryRoutes from './routes/categories';
import transactionRoutes from './routes/transactions';
import googleAuthRoutes from './routes/googleAuth';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: config.corsOrigin ? config.corsOrigin.split(',').map((s) => s.trim()) : false,
    credentials: true,
  }),
);
app.use(express.json({ limit: '10kb' }));
app.use(requestLogger);

app.use(
  session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: config.nodeEnv === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: config.nodeEnv === 'production' ? 'strict' : 'lax',
    },
  }),
);

configurePassport();
app.use(passport.initialize());
app.use(passport.session());

app.use('/api/auth', authLimiter, authRoutes);
app.use('/auth', authLimiter, googleAuthRoutes);
app.use('/api', generalLimiter);
app.use('/api/categories', categoryRoutes);
app.use('/api/transactions', transactionRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/dashboard', (_req, res) => {
  res.json({ message: 'Dashboard — authenticated area' });
});

app.get('/login', (_req, res) => {
  res.status(401).json({ error: 'Login required' });
});

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port} [${config.nodeEnv}]`);
});

export default app;
