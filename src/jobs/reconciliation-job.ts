import { ReconciliationService } from '../services/reconciliation.service';
import { logger } from '../utils/logger';

const reconciliationService = new ReconciliationService();

async function run(): Promise<void> {
  const report = await reconciliationService.generateReport();
  logger.info('Generated reconciliation report', { report });
}

run().catch((error) => {
  logger.error('Reconciliation job failed', {
    error: error instanceof Error ? error.message : 'unknown-error',
  });
  process.exitCode = 1;
});
