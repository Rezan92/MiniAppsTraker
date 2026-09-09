/**
 * Groq Speech-to-Text Client
 * Powered by Groq's high-speed Whisper Large V3 Turbo model ('whisper-large-v3-turbo').
 * Uses native Node 22 Fetch, File, and FormData for zero external dependencies.
 */

export const GROQ_WHISPER_MODEL = 'whisper-large-v3-turbo';

/**
 * Resolves a valid file extension matching the recorded MIME type.
 * Groq requires an explicit file extension (e.g. recording.webm or recording.mp4)
 * on the uploaded FormData file to prevent transcription format errors.
 * @param {string} [mimeType]
 * @returns {string}
 */
export function getAudioExtension(mimeType = '') {
  const lower = String(mimeType).toLowerCase();
  if (lower.includes('webm')) return 'webm';
  if (lower.includes('mp4') || lower.includes('m4a') || lower.includes('aac')) return 'mp4';
  if (lower.includes('wav')) return 'wav';
  if (lower.includes('ogg')) return 'ogg';
  if (lower.includes('mp3') || lower.includes('mpeg')) return 'mp3';
  if (lower.includes('flac')) return 'flac';
  return 'webm';
}

/**
 * Checks if Groq Speech-to-Text is configured in the environment.
 * @returns {{ hasGroqKey: boolean, model: string }}
 */
export function getGroqConfig() {
  return {
    hasGroqKey: Boolean(process.env.GROQ_API_KEY),
    model: GROQ_WHISPER_MODEL
  };
}

/**
 * Transcribes an audio buffer using Groq's Whisper Large V3 Turbo model.
 * @param {Object} params
 * @param {Buffer} params.audioBuffer - Raw binary audio data
 * @param {string} [params.mimeType='audio/webm'] - Audio MIME type
 * @returns {Promise<{ text: string }>}
 */
export async function transcribeAudio({ audioBuffer, mimeType = 'audio/webm' }) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    const err = new Error('Groq API key is not configured. Please add GROQ_API_KEY to apps/api/.env.');
    err.status = 503;
    err.code = 'GROQ_KEY_MISSING';
    throw err;
  }

  if (!audioBuffer || !Buffer.isBuffer(audioBuffer) || audioBuffer.length === 0) {
    const err = new Error('Audio data is missing or empty.');
    err.status = 400;
    err.code = 'INVALID_AUDIO';
    throw err;
  }

  const extension = getAudioExtension(mimeType);
  const fileName = `recording.${extension}`;
  const audioFile = new File([audioBuffer], fileName, { type: mimeType });

  const formData = new FormData();
  formData.append('file', audioFile);
  formData.append('model', GROQ_WHISPER_MODEL);
  formData.append('response_format', 'json');

  let response;
  try {
    response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    });
  } catch (netErr) {
    const err = new Error(`Failed to reach Groq Speech API: ${netErr.message}`);
    err.status = 502;
    err.code = 'GROQ_NETWORK_ERROR';
    throw err;
  }

  if (!response.ok) {
    let errorMessage = `Groq API responded with status ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson?.error?.message) {
        errorMessage = errJson.error.message;
      }
    } catch {
      const errText = await response.text();
      if (errText) errorMessage = errText;
    }

    const err = new Error(`Speech transcription failed: ${errorMessage}`);
    err.status = response.status;
    err.code = 'TRANSCRIPTION_FAILED';
    throw err;
  }

  const result = await response.json();
  return {
    text: result.text ? result.text.trim() : ''
  };
}
