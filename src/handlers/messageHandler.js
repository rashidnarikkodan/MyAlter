import { downloadMediaMessage } from "@whiskeysockets/baileys";
import { replayAi, transcribeAudio } from "../services/ai.js";
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
      const messageContent = msg.message;
      const text = messageContent.conversation || messageContent.extendedTextMessage?.text;
      const audioMessage = messageContent.audioMessage;

      if (text) {
        logger.info(
          { sender: msg.key.remoteJid, message: text },
          "Received text message"
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
          logger.error(err, "Failed to process text message or send reply");
        }
      } else if (audioMessage) {
        logger.info(
          { sender: msg.key.remoteJid, mimeType: audioMessage.mimetype },
          "Received audio message"
        );

        try {
          // Download audio using Baileys helper
          const buffer = await downloadMediaMessage(
            msg,
            "buffer",
            {},
            {
              logger: logger,
              reuploadRequest: sock.updateMediaMessage,
            }
          );

          // Transcribe the downloaded buffer
          const transcribedText = await transcribeAudio(buffer, audioMessage.mimetype);

          if (transcribedText) {
            logger.info(
              { sender: msg.key.remoteJid, transcribedText },
              "Transcribed voice message to text"
            );

            // Replay with the persona using transcribed text
            const replay = await replayAi(transcribedText, msg.key.remoteJid);
            
            await sock.sendMessage(msg.key.remoteJid, {
              text: replay,
            });

            logger.info(
              { recipient: msg.key.remoteJid, reply: replay },
              "Sent reply to voice message"
            );
          } else {
            logger.warn(
              { sender: msg.key.remoteJid },
              "Audio transcription returned empty text"
            );
          }
        } catch (err) {
          logger.error(err, "Failed to process audio message, transcribe or reply");
        }
      }
    }
  });
}
