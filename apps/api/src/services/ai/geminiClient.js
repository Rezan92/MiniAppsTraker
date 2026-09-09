import { GoogleGenAI } from '@google/genai';

const clientCache = {
  free: null,
  paid: null
};

export const DEFAULT_AI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';

/**
 * Returns configuration status for Gemini API keys.
 * @returns {{ hasFreeKey: boolean, hasPaidKey: boolean, defaultModel: string }}
 */
export function getAiConfig() {
  const paidKey = process.env.GEMINI_API_KEY_PAID || process.env.GEMINI_API_KEY_PAYED;
  return {
    hasFreeKey: Boolean(process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_FREE),
    hasPaidKey: Boolean(paidKey),
    defaultModel: DEFAULT_AI_MODEL
  };
}

/**
 * Returns a GoogleGenAI client instance for the requested tier ('free' or 'paid').
 * @param {'free'|'paid'} [tier='free']
 * @returns {{ ai: GoogleGenAI, activeTier: 'free'|'paid', isPaidKeyConfigured: boolean }}
 */
export function getAiClient(tier = 'free') {
  const requestedTier = tier === 'paid' ? 'paid' : 'free';
  const paidKey = process.env.GEMINI_API_KEY_PAID || process.env.GEMINI_API_KEY_PAYED;
  const hasDedicatedPaidKey = Boolean(paidKey);

  let apiKey;
  let activeTier;

  if (requestedTier === 'paid') {
    if (hasDedicatedPaidKey) {
      apiKey = paidKey;
      activeTier = 'paid';
    } else {
      apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_FREE;
      activeTier = 'free';
      console.warn('⚠️ [AI Engine] GEMINI_API_KEY_PAID requested but not set in environment. Using default GEMINI_API_KEY.');
    }
  } else {
    apiKey = process.env.GEMINI_API_KEY_FREE || process.env.GEMINI_API_KEY;
    activeTier = 'free';
  }

  if (!apiKey) {
    const err = new Error(
      requestedTier === 'paid'
        ? 'Paid Gemini API key is not configured. Please add GEMINI_API_KEY_PAID to apps/api/.env.'
        : 'Gemini API key is not configured. Please add GEMINI_API_KEY to apps/api/.env.'
    );
    err.status = 503;
    err.code = 'AI_KEY_MISSING';
    throw err;
  }

  const cacheKey = activeTier;
  if (!clientCache[cacheKey] || clientCache[cacheKey].apiKey !== apiKey) {
    clientCache[cacheKey] = {
      apiKey,
      instance: new GoogleGenAI({ apiKey })
    };
  }

  return {
    ai: clientCache[cacheKey].instance,
    activeTier,
    isPaidKeyConfigured: hasDedicatedPaidKey
  };
}

// Backward compatible default instance
export const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY_FREE || process.env.GEMINI_API_KEY || ''
});
