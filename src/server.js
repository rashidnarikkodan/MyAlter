import { startBot } from "./services/whatsapp.js";
import logger from "./utils/logger.js";

startBot().catch((err) => {
  logger.error(err, "Failed to bootstrap WhatsApp bot");
  process.exit(1);
});