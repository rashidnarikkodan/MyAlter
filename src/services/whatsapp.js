import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason
} from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";
import { config } from "../config/env.js";
import { registerMessageHandlers } from "../handlers/messageHandler.js";
import logger from "../utils/logger.js";

export async function startBot() {
  logger.info("Starting WhatsApp bot service...");

  // Auth state persistence in the folder defined in config
  const { state, saveCreds } = await useMultiFileAuthState(config.authInfoDir);

  // Fetch the latest version of WhatsApp
  const { version } = await fetchLatestBaileysVersion();
  logger.info({ version: version.join('.') }, "Using Baileys version");

  // Initialize socket
  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true
  });

  // Update credentials when changed
  sock.ev.on("creds.update", saveCreds);

  // Update connection status when changed 
  sock.ev.on("connection.update", (update) => {
    const { connection, qr, lastDisconnect } = update;

    if (qr) {
      logger.info("New QR Code generated. Scan with your WhatsApp app:");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      const errorMessage = lastDisconnect?.error?.message || lastDisconnect?.error;

      logger.warn(
        { statusCode, shouldReconnect, error: errorMessage },
        "WhatsApp connection closed"
      );

      if (shouldReconnect) {
        logger.info("Attempting to reconnect...");
        startBot();
      } else {
        logger.error("Logged out of WhatsApp. Reconnection aborted. Please clear auth session and scan QR code again.");
      }
    } else if (connection === "open") {
      logger.info("WhatsApp successfully connected! 🎉");
    }
  });

  // Register all event handlers
  registerMessageHandlers(sock);

  return sock;
}
