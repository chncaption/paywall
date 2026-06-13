import { createApp } from './app';
import { ensureRedis } from './db/redis';
import { query } from './db/query';
import { AuthService } from './services/auth.service';
import { PlanService } from './services/plan.service';
import { env } from './config';
import { logger } from './utils/logger';

async function bootstrap(): Promise<void> {
  await query('SELECT 1');
  await ensureRedis();

  const authService = new AuthService();
  const planService = new PlanService();

  await authService.ensureDefaultAdmin();
  await planService.seedDefaults();

  const app = createApp();
  app.listen(env.PORT, () => {
    logger.info('HTTP server listening', {
      port: env.PORT,
      environment: env.NODE_ENV,
    });
  });
}

bootstrap().catch((error) => {
  logger.error('Service bootstrap failed', {
    error: error instanceof Error ? error.message : 'unknown-error',
  });
  process.exit(1);
});
