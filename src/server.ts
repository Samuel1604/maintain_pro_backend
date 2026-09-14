import app from "./app.js";
import { AppContainer } from "./container/app.container.js";
import { appConfig } from "./config/app.config.js";
import { ConsoleLogger } from "./infrastructure/logging/console.logger.js";
import { LoggerService } from "./infrastructure/logging/logger.service.js";
import { validateProductionEnvironment } from "./config/production-validation.js";
// import { TunnelService } from './infrastructure/tunnel/tunnel.service.js'

// A temporary logger for bootstrap errors before the container is ready.
const initialLogger = new LoggerService(new ConsoleLogger());

async function bootstrap() {
  validateProductionEnvironment();
  const container = new AppContainer();
  await container.init();
  const logger = container.loggerService; // Use the container's logger after init

  const server = await container.startServer(appConfig.port, app);
  // const tunnel = new TunnelService()
  // tunnel.start(appConfig.port)

  const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];
  let shuttingDown = false;

  const gracefulShutdown = async (signal: NodeJS.Signals) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`Received ${signal}. Initiating graceful shutdown...`);
    // tunnel.stop()
    container.socketGateway.close();
    server.close(async (err) => {
      if (err) {
        logger.error("Error closing HTTP server:", err);
      } else {
        logger.info("HTTP server closed.");
      }
      try {
        await container.shutdown();
        logger.info("Application resources have been shut down.");
        process.exit(0);
      } catch (shutdownError) {
        logger.error("Error during graceful shutdown of resources:", shutdownError);
        process.exit(1);
      }
    });
  };

  for (const signal of signals) {
    process.on(signal, () => gracefulShutdown(signal));
  }

  logger.info(`🚀 MaintainPro API server started on port ${appConfig.port}`);
}

bootstrap().catch((error) => {
  initialLogger.error("❌ Failed to bootstrap the application:", error);
  process.exit(1);
});
