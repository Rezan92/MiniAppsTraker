import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn('⚠️ [AI Engine] GEMINI_API_KEY is not defined in environment variables.');
}

export const ai = new GoogleGenAI({ apiKey: apiKey || '' });
export const DEFAULT_AI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
