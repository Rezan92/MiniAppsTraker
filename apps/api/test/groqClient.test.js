import test from 'node:test';
import assert from 'node:assert/strict';
import { getAudioExtension, getGroqConfig, transcribeAudio, GROQ_WHISPER_MODEL } from '../src/services/ai/groqClient.js';

test('getAudioExtension maps MIME types to exact valid audio file extensions', () => {
  assert.equal(getAudioExtension('audio/webm'), 'webm');
  assert.equal(getAudioExtension('audio/webm;codecs=opus'), 'webm');
  assert.equal(getAudioExtension('audio/mp4'), 'mp4');
  assert.equal(getAudioExtension('audio/m4a'), 'mp4');
  assert.equal(getAudioExtension('audio/x-m4a'), 'mp4');
  assert.equal(getAudioExtension('audio/wav'), 'wav');
  assert.equal(getAudioExtension('audio/x-wav'), 'wav');
  assert.equal(getAudioExtension('audio/ogg'), 'ogg');
  assert.equal(getAudioExtension('audio/mpeg'), 'mp3');
  assert.equal(getAudioExtension('audio/mp3'), 'mp3');
  assert.equal(getAudioExtension('audio/flac'), 'flac');
  assert.equal(getAudioExtension(''), 'webm');
  assert.equal(getAudioExtension(null), 'webm');
});

test('getGroqConfig reports key availability and whisper model', () => {
  const cfg = getGroqConfig();
  assert.equal(typeof cfg.hasGroqKey, 'boolean');
  assert.equal(cfg.model, GROQ_WHISPER_MODEL);
  assert.equal(cfg.model, 'whisper-large-v3-turbo');
});

test('transcribeAudio guards reject missing key and empty buffer', async () => {
  // Test missing buffer with fake key
  const prevKey = process.env.GROQ_API_KEY;
  try {
    process.env.GROQ_API_KEY = 'test-mock-key';

    await assert.rejects(
      async () => {
        await transcribeAudio({ audioBuffer: null });
      },
      { code: 'INVALID_AUDIO' }
    );

    await assert.rejects(
      async () => {
        await transcribeAudio({ audioBuffer: Buffer.alloc(0) });
      },
      { code: 'INVALID_AUDIO' }
    );

    // Test missing key
    delete process.env.GROQ_API_KEY;
    await assert.rejects(
      async () => {
        await transcribeAudio({ audioBuffer: Buffer.from('mock audio') });
      },
      { code: 'GROQ_KEY_MISSING' }
    );
  } finally {
    if (prevKey !== undefined) {
      process.env.GROQ_API_KEY = prevKey;
    } else {
      delete process.env.GROQ_API_KEY;
    }
  }
});
