import { GoogleGenAI } from "@google/genai";
import { config } from "../config/env.js";
import { getBasePersona, getRelationshipRules, CONTACT_RELATIONS } from "../constants/persona.js";
import logger from "../utils/logger.js";

const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

export async function replayAi(msg, senderJid) {
  const relation = CONTACT_RELATIONS[senderJid] || "General";

  const systemInstruction = `
${getBasePersona()}

RELATIONSHIP RULES:
${getRelationshipRules(relation)}
`;

  try {
    logger.debug({ senderJid, relation }, "Generating AI response");
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: msg }],
        },
      ],
      config: {
        systemInstruction,
      },
    });

    return response.text;
  } catch (error) {
    if (error.status === 429) {
      logger.warn({ senderJid }, "AI rate limit hit (429)");
      return "i am busy text me later";
    }

    logger.error(error, "AI Generation Error");
    return "Sorry, something went wrong with my brain 🤖";
  }
}
