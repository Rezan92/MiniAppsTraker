import { AI_TOOLS } from './aiToolDefinitions.js';
import { executeAiTool } from './aiToolExecutors.js';

export const NVIDIA_INVOKE_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
export const DEFAULT_NVIDIA_MODEL = process.env.NVIDIA_MODEL || 'moonshotai/kimi-k3';
export const NVIDIA_MODELS = ['moonshotai/kimi-k3'];

/**
 * Determines whether a given model ID should be served via the NVIDIA Build integration.
 * @param {string} [model]
 * @returns {boolean}
 */
export function isNvidiaModel(model) {
  if (!model || typeof model !== 'string') return false;
  const lower = model.toLowerCase();
  if (lower.startsWith('gemini')) return false;
  return (
    model.includes('/') ||
    NVIDIA_MODELS.includes(model) ||
    lower.includes('nvidia') ||
    lower.includes('kimi') ||
    lower.includes('deepseek') ||
    lower.includes('nemotron') ||
    lower.includes('llama') ||
    lower.includes('gemma') ||
    lower.includes('phi') ||
    lower.includes('qwen')
  );
}

/**
 * Returns configuration status for NVIDIA Build API.
 * @returns {{ hasNvidiaKey: boolean, nvidiaModel: string }}
 */
export function getNvidiaConfig() {
  return {
    hasNvidiaKey: Boolean(process.env.NVIDIA_API_KEY),
    nvidiaModel: DEFAULT_NVIDIA_MODEL
  };
}

/**
 * Recursively converts Gemini OpenAPI uppercase schema types (OBJECT, STRING, etc.)
 * to standard OpenAI lowercase JSON schema types (object, string, etc.).
 * @param {Object} schema
 * @returns {Object}
 */
export function toOpenAiSchema(schema) {
  if (!schema || typeof schema !== 'object') return schema;
  const converted = {};
  for (const [key, val] of Object.entries(schema)) {
    if (key === 'type' && typeof val === 'string') {
      converted[key] = val.toLowerCase();
    } else if (Array.isArray(val)) {
      converted[key] = val.map(item => (typeof item === 'object' && item !== null ? toOpenAiSchema(item) : item));
    } else if (typeof val === 'object' && val !== null) {
      converted[key] = toOpenAiSchema(val);
    } else {
      converted[key] = val;
    }
  }
  return converted;
}

let cachedOpenAiTools = null;

/**
 * Translates AI_TOOLS into OpenAI-compatible tool specifications for NVIDIA chat completions.
 * @returns {Array<Object>}
 */
export function getNvidiaTools() {
  if (!cachedOpenAiTools) {
    cachedOpenAiTools = AI_TOOLS.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: toOpenAiSchema(tool.parameters)
      }
    }));
  }
  return cachedOpenAiTools;
}

/**
 * Direct HTTP caller for NVIDIA Build Chat Completions endpoint.
 * Uses native Node fetch for zero external dependencies.
 * @param {Object} params
 * @param {Array<Object>} params.messages
 * @param {string} [params.model]
 * @param {Array<Object>} [params.tools]
 * @param {number} [params.max_tokens=4096]
 * @param {number} [params.temperature=1]
 * @param {string} [params.reasoning_effort='max']
 * @returns {Promise<Object>} Parsed JSON response
 */
export async function callNvidiaChatCompletion({
  messages,
  model = DEFAULT_NVIDIA_MODEL,
  tools = null,
  max_tokens = 4096,
  temperature = 1,
  reasoning_effort = 'max'
}) {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    const err = new Error('NVIDIA API key is not configured. Please add NVIDIA_API_KEY to apps/api/.env to use NVIDIA models.');
    err.status = 503;
    err.code = 'NVIDIA_KEY_MISSING';
    throw err;
  }

  const payload = {
    model,
    messages,
    max_tokens,
    temperature,
    stream: false,
    reasoning_effort
  };

  if (tools && Array.isArray(tools) && tools.length > 0) {
    payload.tools = tools;
    payload.tool_choice = 'auto';
  }

  const response = await fetch(NVIDIA_INVOKE_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    let parsedMessage = errorText;
    try {
      const parsedJson = JSON.parse(errorText);
      parsedMessage = parsedJson.error?.message || parsedJson.message || errorText;
    } catch {}

    const err = new Error(`NVIDIA API error (${response.status}): ${parsedMessage}`);
    err.status = response.status;
    err.code = 'NVIDIA_API_ERROR';
    throw err;
  }

  return response.json();
}

/**
 * Executes a full multi-turn chat session with domain tool calling powered by NVIDIA Build.
 * Maintains complete parity with Gemini tool execution, mutation logging, and active focus tracking.
 * @param {Object} params
 * @param {Array<Object>} params.messages - Incoming message history
 * @param {string} params.systemInstruction - Generated system prompt
 * @param {string} [params.activeModel] - Model identifier (e.g. 'moonshotai/kimi-k3')
 * @param {string} params.tenantId - Authenticated tenant ID
 * @param {string} params.userId - Authenticated user ID
 * @param {Object} [params.currentActiveFocus] - Currently focused entity
 * @param {number} [params.maxTurns=8] - Max multi-turn tool loops
 * @returns {Promise<Object>}
 */
export async function executeNvidiaChatWithTools({
  messages,
  systemInstruction,
  activeModel = DEFAULT_NVIDIA_MODEL,
  tenantId,
  userId,
  currentActiveFocus = null,
  timezone = 'UTC',
  maxTurns = 8
}) {
  // Build OpenAI-compatible message history
  const openAiMessages = [
    { role: 'system', content: systemInstruction }
  ];

  messages.forEach((m, index) => {
    const isLatest = index === messages.length - 1;
    const role = m.role === 'model' ? 'assistant' : (m.role || 'user');

    if (m.attachment) {
      if (isLatest && m.attachment.data) {
        const rawBase64 = m.attachment.data.includes('base64,')
          ? m.attachment.data.split('base64,')[1]
          : m.attachment.data;
        const mimeType = m.attachment.mimeType || 'image/jpeg';

        openAiMessages.push({
          role,
          content: [
            { type: 'text', text: m.content || 'Please analyze this image.' },
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${rawBase64}` }
            }
          ]
        });
        return;
      } else {
        openAiMessages.push({
          role,
          content: `${m.content || ''} [Attached image: ${m.attachment.name || 'photo'} (previously analyzed)]`.trim()
        });
        return;
      }
    }

    openAiMessages.push({
      role,
      content: m.content || ' '
    });
  });

  const tools = getNvidiaTools();
  const triggeredMutations = [];
  let pendingConfirmation = null;
  let invoiceCardData = null;
  let activeFocus = currentActiveFocus || null;

  let currentTurn = 0;

  while (currentTurn < maxTurns) {
    currentTurn++;

    const response = await callNvidiaChatCompletion({
      messages: openAiMessages,
      model: activeModel,
      tools
    });

    const choice = response.choices?.[0];
    const message = choice?.message;
    const toolCalls = message?.tool_calls;

    if (!toolCalls || toolCalls.length === 0) {
      // Natural language reply reached
      const replyText = message?.content || '';
      console.log(`🤖 [NVIDIA Response] Model: ${activeModel} | Reply: "${replyText.slice(0, 100)}..." | Mutations: ${triggeredMutations.length}`);

      return {
        reply: replyText,
        triggered_mutations: triggeredMutations,
        confirmationData: pendingConfirmation,
        invoiceData: invoiceCardData,
        activeFocus,
        model_used: activeModel,
        tier_used: 'free',
        is_paid_configured: true
      };
    }

    // Append the assistant tool_calls turn to conversation history
    openAiMessages.push(message);

    // Execute each tool call sequentially
    for (const call of toolCalls) {
      const fnName = call.function.name;
      let fnArgs = {};
      try {
        fnArgs = JSON.parse(call.function.arguments || '{}');
      } catch (parseErr) {
        console.warn(`⚠️ [NVIDIA Tool Call] Failed to parse arguments for "${fnName}":`, call.function.arguments);
      }

      console.log(`⚙️ [NVIDIA Tool Call] Function: "${fnName}" | Args:`, JSON.stringify(fnArgs));
      const toolResult = await executeAiTool(fnName, fnArgs, {
        tenantId,
        userId,
        timezone
      });

      if (toolResult.error) {
        console.error(`❌ [NVIDIA Tool Failed] "${fnName}":`, toolResult.error);
      } else {
        console.log(`✅ [NVIDIA Tool Success] "${fnName}" | Mutation:`, toolResult.mutation || 'none');
      }

      if (toolResult.mutation) {
        triggeredMutations.push({
          type: toolResult.mutation,
          entityId: toolResult.entityId
        });
      }

      if (toolResult.result?.confirmation_required) {
        pendingConfirmation = toolResult.result;
      }

      // Active Focus Tracking across turns
      if (fnName === 'draft_invoice' && toolResult.result?.invoiceId) {
        invoiceCardData = toolResult.result;
        activeFocus = {
          entityType: 'invoice',
          entityId: toolResult.result.invoiceId,
          humanNumber: toolResult.result.invoiceNumber,
          title: `Invoice #${toolResult.result.invoiceNumber}`,
          timestamp: Date.now()
        };
      } else if (fnName === 'create_job' && toolResult.result?.id) {
        activeFocus = {
          entityType: 'job',
          entityId: toolResult.result.id,
          humanNumber: null,
          title: toolResult.result.title,
          timestamp: Date.now()
        };
      } else if (fnName === 'create_client' && toolResult.result?.id) {
        activeFocus = {
          entityType: 'client',
          entityId: toolResult.result.id,
          humanNumber: null,
          title: toolResult.result.name,
          timestamp: Date.now()
        };
      } else if (fnName === 'get_invoice_details' && toolResult.result?.id) {
        activeFocus = {
          entityType: 'invoice',
          entityId: toolResult.result.id,
          humanNumber: toolResult.result.invoice_number,
          title: `Invoice #${toolResult.result.invoice_number}`,
          timestamp: Date.now()
        };
      } else if (fnName === 'get_job_details' && toolResult.result?.job?.id) {
        activeFocus = {
          entityType: 'job',
          entityId: toolResult.result.job.id,
          humanNumber: null,
          title: toolResult.result.job.title,
          timestamp: Date.now()
        };
      }

      openAiMessages.push({
        role: 'tool',
        tool_call_id: call.id,
        name: fnName,
        content: JSON.stringify(toolResult.result || { error: toolResult.error })
      });
    }
  }

  // Safety fallback if turns exceeded
  return {
    reply: "I've processed your request with multiple steps.",
    triggered_mutations: triggeredMutations,
    confirmationData: pendingConfirmation,
    invoiceData: invoiceCardData,
    activeFocus,
    model_used: activeModel,
    tier_used: 'free',
    is_paid_configured: true
  };
}
