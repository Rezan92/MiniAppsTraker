import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isNvidiaModel,
  getNvidiaConfig,
  toOpenAiSchema,
  getNvidiaTools,
  callNvidiaChatCompletion,
  DEFAULT_NVIDIA_MODEL
} from '../src/services/ai/nvidiaClient.js';
import { AI_TOOLS } from '../src/services/ai/aiToolDefinitions.js';

test('isNvidiaModel accurately identifies NVIDIA and Moonshot models', () => {
  assert.equal(isNvidiaModel('moonshotai/kimi-k3'), true);
  assert.equal(isNvidiaModel('deepseek-ai/deepseek-r1-distill-qwen-14b'), true);
  assert.equal(isNvidiaModel('qwen/qwen2.5-coder-32b-instruct'), true);
  assert.equal(isNvidiaModel('meta/muse-glimmer-30b'), true);
  assert.equal(isNvidiaModel('google/gemma-4-31b-it'), true);
  assert.equal(isNvidiaModel('nvidia/nemotron-3.5-lightning-30b-a3b'), true);
  assert.equal(isNvidiaModel('kimi-k3'), true);
  assert.equal(isNvidiaModel('gemini-3.1-flash-lite'), false);
  assert.equal(isNvidiaModel('gemini-3.5-flash'), false);
  assert.equal(isNvidiaModel(''), false);
  assert.equal(isNvidiaModel(null), false);
  assert.equal(isNvidiaModel(undefined), false);
});

test('getNvidiaConfig reports key availability and default model', () => {
  const cfg = getNvidiaConfig();
  assert.equal(typeof cfg.hasNvidiaKey, 'boolean');
  assert.equal(cfg.nvidiaModel, DEFAULT_NVIDIA_MODEL);
  assert.equal(cfg.nvidiaModel, 'moonshotai/kimi-k3');
});

test('toOpenAiSchema recursively converts uppercase types to lowercase JSON schema', () => {
  const geminiSchema = {
    type: 'OBJECT',
    properties: {
      client_name: { type: 'STRING', description: 'Name' },
      hourly_rate: { type: 'NUMBER', description: 'Rate' },
      is_active: { type: 'BOOLEAN' },
      tags: {
        type: 'ARRAY',
        items: { type: 'STRING' }
      }
    },
    required: ['client_name']
  };

  const converted = toOpenAiSchema(geminiSchema);
  assert.equal(converted.type, 'object');
  assert.equal(converted.properties.client_name.type, 'string');
  assert.equal(converted.properties.hourly_rate.type, 'number');
  assert.equal(converted.properties.is_active.type, 'boolean');
  assert.equal(converted.properties.tags.type, 'array');
  assert.equal(converted.properties.tags.items.type, 'string');
  assert.deepEqual(converted.required, ['client_name']);
});

test('getNvidiaTools converts all domain AI_TOOLS to valid OpenAI function format', () => {
  const tools = getNvidiaTools();
  assert.equal(tools.length, AI_TOOLS.length);

  for (const tool of tools) {
    assert.equal(tool.type, 'function');
    assert.equal(typeof tool.function.name, 'string');
    assert.equal(typeof tool.function.description, 'string');
    assert.equal(tool.function.parameters.type, 'object');
  }

  const clientTool = tools.find(t => t.function.name === 'create_client');
  assert.ok(clientTool);
  assert.equal(clientTool.function.parameters.properties.name.type, 'string');
});

test('callNvidiaChatCompletion rejects with NVIDIA_KEY_MISSING if API key is not configured', async () => {
  const prevKey = process.env.NVIDIA_API_KEY;
  try {
    delete process.env.NVIDIA_API_KEY;

    await assert.rejects(
      async () => {
        await callNvidiaChatCompletion({
          messages: [{ role: 'user', content: 'test' }]
        });
      },
      { code: 'NVIDIA_KEY_MISSING' }
    );
  } finally {
    if (prevKey !== undefined) {
      process.env.NVIDIA_API_KEY = prevKey;
    } else {
      delete process.env.NVIDIA_API_KEY;
    }
  }
});
