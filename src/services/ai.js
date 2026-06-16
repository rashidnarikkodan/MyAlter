import { GoogleGenAI } from "@google/genai";
import { config } from "../config/env.js";
import { getBasePersona, getRelationshipRules, CONTACT_RELATIONS } from "../constants/persona.js";
import logger from "../utils/logger.js";

const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

// In-memory store for conversational history per senderJid
const chatHistories = new Map();

export async function replayAi(msg, senderJid) {
  const relation = CONTACT_RELATIONS[senderJid] || "General";

  const systemInstruction = `
${getBasePersona()}

RELATIONSHIP RULES:
${getRelationshipRules(relation)}
`;

  // Retrieve or initialize history
  let history = chatHistories.get(senderJid) || [];

  // Append new user message
  history.push({
    role: "user",
    parts: [{ text: msg }],
  });

  // Ensure history does not exceed the configured limit and alternates correctly (starts with "user")
  const limit = config.maxHistoryLimit;
  if (history.length > limit) {
    history = history.slice(-limit);
    // Gemini multi-turn conversation expects the conversation to start with "user"
    while (history.length > 0 && history[0].role !== "user") {
      history.shift();
    }
  }

  try {
    logger.debug({ senderJid, relation, historyLength: history.length }, "Generating AI response with history context");
    
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: history,
      config: {
        systemInstruction,
      },
    });

    const replyText = response.text;

    // Append generated model reply to history
    history.push({
      role: "model",
      parts: [{ text: replyText }],
    });
    
    // Save updated history back
    chatHistories.set(senderJid, history);

    return replyText;
  } catch (error) {
    // If the request fails, remove the un-replied user message from history so the client can retry
    history.pop();
    chatHistories.set(senderJid, history);

    if (error.status === 429) {
      logger.warn({ senderJid }, "AI rate limit hit (429)");
      return "i am busy text me later";
    }

    logger.error(error, "AI Generation Error");
    return "Sorry, something went wrong with my brain 🤖";
  }
}
