import { replayAi } from "../services/ai.js";
import logger from "../utils/logger.js";

export function registerMessageHandlers(sock) {
  sock.ev.on("messages.upsert", async (e) => {
    const msg = e.messages[0];

    if (!msg || !msg.message) return;

    // Skip group messages
    if (msg.key.remoteJid.endsWith("@g.us")) {
      return;
    }

    // Process if not from me
    if (!msg.key.fromMe) {
      const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
      if (text) {
        logger.info(
          { sender: msg.key.remoteJid, message: text },
          "Received message"
        );

        try {
          const replay = await replayAi(text, msg.key.remoteJid);
          
          await sock.sendMessage(msg.key.remoteJid, {
            text: replay,
          });

          logger.info(
            { recipient: msg.key.remoteJid, reply: replay },
            "Sent reply"
          );
        } catch (err) {
          logger.error(err, "Failed to process message or send reply");
        }
      }
    }
  });
}
