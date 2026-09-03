import express from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { createApiError } from '../middleware/errorHandler.js';
import { ai, DEFAULT_AI_MODEL } from '../services/ai/geminiClient.js';
import { AI_TOOLS } from '../services/ai/aiToolDefinitions.js';
import { executeAiTool } from '../services/ai/aiToolExecutors.js';
import { buildSystemInstruction } from '../services/ai/promptBuilder.js';

const router = express.Router();
router.use(authenticate);

const chatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'model', 'assistant']),
    content: z.string().min(1)
  })).min(1, 'At least one message is required'),
  screenContext: z.object({
    screen: z.string(),
    entityId: z.string().optional().nullable(),
    summary: z.record(z.any()).optional().nullable()
  }).optional().nullable()
});

router.post('/chat', async (req, res, next) => {
  try {
    const tenantId = req.user?.tenant_id;
    if (!tenantId) {
      return next(createApiError('Tenant context missing from authenticated session', 400, 'TENANT_REQUIRED'));
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        success: false,
        error: {
          message: 'Gemini API key is not configured. Please add GEMINI_API_KEY to apps/api/.env to activate the AI copilot.',
          code: 'AI_KEY_MISSING'
        }
      });
    }

    const parseResult = chatRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return next(parseResult.error);
    }

    const { messages, screenContext } = parseResult.data;
    const systemInstruction = buildSystemInstruction({ user: req.user, screenContext });
    const triggeredMutations = [];

    // Format chat history for @google/genai
    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : m.role,
      parts: [{ text: m.content }]
    }));

    // Multi-turn tool execution loop (up to 5 turns)
    let currentTurn = 0;
    const maxTurns = 5;

    while (currentTurn < maxTurns) {
      currentTurn++;

      const response = await ai.models.generateContent({
        model: DEFAULT_AI_MODEL,
        contents,
        config: {
          systemInstruction,
          tools: [{ functionDeclarations: AI_TOOLS }]
        }
      });

      const candidate = response.candidates?.[0];
      const content = candidate?.content;
      const functionCalls = content?.parts?.filter(p => p.functionCall)?.map(p => p.functionCall);

      if (!functionCalls || functionCalls.length === 0) {
        // No function calls — Gemini provided a direct natural language response
        const replyText = content?.parts?.map(p => p.text).filter(Boolean).join('\n') || '';
        return res.json({
          success: true,
          data: {
            reply: replyText,
            triggered_mutations: triggeredMutations
          }
        });
      }

      // Append the model's function call turn to history
      contents.push(content);

      // Execute each function call
      const toolResponseParts = [];
      for (const call of functionCalls) {
        const toolResult = await executeAiTool(call.name, call.args, {
          tenantId,
          userId: req.user.id
        });

        if (toolResult.mutation) {
          triggeredMutations.push({
            type: toolResult.mutation,
            entityId: toolResult.entityId
          });
        }

        toolResponseParts.push({
          functionResponse: {
            name: call.name,
            response: { output: toolResult.result || { error: toolResult.error } }
          }
        });
      }

      // Append function response parts as a user turn back to Gemini
      contents.push({
        role: 'user',
        parts: toolResponseParts
      });
    }

    res.json({
      success: true,
      data: {
        reply: "I processed your request, but hit the maximum tool interaction limit. Please check your latest entries.",
        triggered_mutations: triggeredMutations
      }
    });

  } catch (err) {
    next(err);
  }
});

export default router;
