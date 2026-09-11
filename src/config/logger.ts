/**
 * Backward-compatible logger export for older imports.
 * New code should depend on the logger service/container directly.
 */
import { ConsoleLogger } from "@/infrastructure/logging/console.logger.js";

const logger = new ConsoleLogger();

export default logger;
