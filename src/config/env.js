import dotenv from 'dotenv';
dotenv.config();

export const config = {
  geminiApiKey: process.env.GEMINI_API_KEY,
  xaiApiKey: process.env.XAI_API_KEY,
  authInfoDir: process.env.AUTH_INFO_DIR || 'auth_info',
  logLevel: process.env.LOG_LEVEL || 'info',
  maxHistoryLimit: parseInt(process.env.MAX_HISTORY_LIMIT || '20', 10),
};

// Simple validation
if (!config.geminiApiKey) {
  console.warn("WARNING: GEMINI_API_KEY is not defined in the environment variables!");
}
