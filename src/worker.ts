import { AppContainer } from './container/app.container.js';
import { ConsoleLogger } from './infrastructure/logging/console.logger.js';
import { LoggerService } from './infrastructure/logging/logger.service.js';
import { validateProductionEnvironment } from './config/production-validation.js';

// A temporary logger for bootstrap errors before the container is ready.
const initialLogger = new LoggerService(new ConsoleLogger());

async function bootstrap() {
  validateProductionEnvironment()
  const container = new AppContainer()
  await container.init()
  const logger = container.loggerService; // Use the container's logger after init

  await container.startWorkers()

  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM']
  let shuttingDown = false

  const gracefulShutdown = async (signal: NodeJS.Signals) => {
    if (shuttingDown) return
    shuttingDown = true
    logger.info(`Received ${signal}. Initiating graceful worker shutdown...`)
    try {
      await container.shutdown()
      logger.info('Worker resources have been shut down.')
      process.exit(0)
    } catch (shutdownError) {
      logger.error('Error during graceful shutdown of worker resources:', shutdownError)
      process.exit(1)
    }
  }
  for (const signal of signals) {
    process.on(signal, () => gracefulShutdown(signal))
  }

  logger.info('✅ MaintainPro background workers started and are processing jobs.')
}

bootstrap().catch((error) => {
  initialLogger.error('❌ Failed to bootstrap the workers:', error)
  process.exit(1)
})
