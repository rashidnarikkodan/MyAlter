import dotenv from 'dotenv'
dotenv.config()
import { replayAi } from './replayAi.js';
import makeWASocket, {
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    DisconnectReason
} from "@whiskeysockets/baileys";

import qrcode from "qrcode-terminal";

async function startBot() {

    //auth state persistence in auth_info folder
    const { state, saveCreds } = await useMultiFileAuthState("auth_info");

    //fetch latest version of whatsapp
    const { version } = await fetchLatestBaileysVersion();


    //initialize socket
    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: true
    });

    //update credentials when changed
    sock.ev.on("creds.update", saveCreds);

    //update connection status when changed 
    sock.ev.on("connection.update", (update) => {
        const { connection, qr, lastDisconnect } = update;

        if (qr) {
            qrcode.generate(qr, { small: true });
        }

        if (connection === "close") {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log("Connection closed due to:", lastDisconnect?.error?.message || lastDisconnect?.error, ". Reconnecting:", shouldReconnect);
            if (shouldReconnect) {
                startBot();
            }
        } else if (connection === "open") {
            console.log("WhatsApp connected");
        }
    });


    //message handler for text messages
    sock.ev.on("messages.upsert", async (e) => {
        const msg = e.messages[0];

        if (!msg.key.fromMe && msg.message) {
            const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
            if (text) {
                console.log(`Received message from ${msg.key.remoteJid}: "${text}"`);
                const replay = await replayAi(text, msg.key.remoteJid);
                await sock.sendMessage(msg.key.remoteJid, {
                    text: replay,
                });
            }
        }
    });


}

startBot();