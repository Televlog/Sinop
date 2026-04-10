import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import cron from 'node-cron';
import http from 'http';
import { Server as SocketServer } from 'socket.io';

import { env } from './config/env';
import { connectDatabase, prisma } from './config/database';
import { logger } from './config/logger';
import { globalLimiter, apiLimiter } from './middleware/rateLimiter';
import { errorHandler, notFound } from './middleware/errorHandler';

import authRoutes from './routes/auth.routes';
import transactionRoutes from './routes/transaction.routes';
import subscriptionRoutes from './routes/subscription.routes';
import budgetRoutes from './routes/budget.routes';
import reportRoutes from './routes/report.routes';
import adminRoutes from './routes/admin.routes';
import plaidRoutes from './routes/plaid.routes';
import { notificationService } from './services/notification.service';

const app = express();
const server = http.createServer(app);

// =============================
// WebSocket (Real-time)
// =============================
export const io = new SocketServer(server, {
  cors: { origin: (origin, cb) => cb(null, true), credentials: true },
});

io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);
  socket.on('join', (userId: string) => socket.join(`user:${userId}`));
  socket.on('disconnect', () => logger.info(`Socket disconnected: ${socket.id}`));
});

// =============================
// Security & Middleware
// =============================
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
}));

app.use(cors({
  origin: (origin, callback) => {
    if (
      !origin ||
      origin.startsWith('http://localhost') ||
      origin.startsWith('https://localhost') ||
      origin.startsWith('exp://') ||
      origin.endsWith('.netlify.app') ||
      origin.endsWith('.loca.lt') ||
      origin.endsWith('.ngrok-free.app') ||
      origin.endsWith('.github.io') ||
      origin === env.CLIENT_URL ||
      origin === env.MOBILE_URL
    ) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'bypass-tunnel-reminder'],
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan(env.isDev() ? 'dev' : 'combined'));
app.use('/uploads', express.static('uploads'));

// Rate limiting
app.use(globalLimiter);
app.use('/api/', apiLimiter);

// =============================
// Passport OAuth
// =============================
app.use(passport.initialize());

if (env.GOOGLE_CLIENT_ID) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error('No email from Google'));

          const user = await prisma.user.upsert({
            where: { googleId: profile.id },
            create: {
              googleId: profile.id,
              email,
              name: profile.displayName,
              avatarUrl: profile.photos?.[0]?.value,
              isVerified: true,
            },
            update: {
              name: profile.displayName,
              avatarUrl: profile.photos?.[0]?.value,
            },
          });

          done(null, { userId: user.id, email: user.email, role: user.role });
        } catch (error) {
          done(error as Error);
        }
      }
    )
  );
}

// =============================
// Health check
// =============================
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// =============================
// API Routes
// =============================
// Health check for Railway/deployment
app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/plaid', plaidRoutes);

// =============================
// Error Handling
// =============================
app.use(notFound);
app.use(errorHandler);

// =============================
// Scheduled Jobs (Cron)
// =============================
function initializeCronJobs() {
  // Check subscription reminders daily at 9am
  cron.schedule('0 9 * * *', async () => {
    logger.info('Running subscription reminder cron');
    await notificationService.processSubscriptionReminders();
  });

  // Check budget alerts every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    logger.info('Running budget alert cron');
    await notificationService.processBudgetAlerts();
  });

  // Clean up expired refresh tokens weekly
  cron.schedule('0 0 * * 0', async () => {
    const deleted = await prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    logger.info(`Cleaned up ${deleted.count} expired refresh tokens`);
  });

  logger.info('✅ Cron jobs initialized');
}

// =============================
// Server Start
// =============================
async function start() {
  await connectDatabase();
  initializeCronJobs();

  server.listen(env.PORT, () => {
    logger.info(`🚀 FinTrack API running on http://localhost:${env.PORT}`);
    logger.info(`📊 Environment: ${env.NODE_ENV}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received. Shutting down...`);
    server.close(async () => {
      await prisma.$disconnect();
      logger.info('Server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch(err => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});

export default app;
