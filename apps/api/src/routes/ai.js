import express from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { createApiError } from '../middleware/errorHandler.js';
import { supabase } from '../config/supabase.js';
import { ai, DEFAULT_AI_MODEL } from '../services/ai/geminiClient.js';
import { AI_TOOLS } from '../services/ai/aiToolDefinitions.js';
import { executeAiTool } from '../services/ai/aiToolExecutors.js';
import { buildSystemInstruction } from '../services/ai/promptBuilder.js';
import { pendingActionManager } from '../services/ai/pendingActionManager.js';

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
  }).optional().nullable(),
  activeFocus: z.object({
    entityType: z.string().optional().nullable(),
    entityId: z.string().optional().nullable(),
    humanNumber: z.string().optional().nullable(),
    title: z.string().optional().nullable(),
    timestamp: z.number().optional().nullable()
  }).optional().nullable(),
  model: z.string().optional()
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

    const { messages, screenContext, activeFocus, model } = parseResult.data;
    const targetModel = model || DEFAULT_AI_MODEL;
    const lastUserMsg = messages[messages.length - 1]?.content;
    console.log(`\n🤖 [AI Request] Model: ${targetModel} | User: ${req.user.email} | Screen: ${screenContext?.screen || 'Global'} | Prompt: "${lastUserMsg}"`);

    let currentActiveFocus = activeFocus || null;
    const systemInstruction = buildSystemInstruction({ user: req.user, screenContext, activeFocus: currentActiveFocus });
    const triggeredMutations = [];
    let pendingConfirmation = null;
    let invoiceCardData = null;

    // Format chat history for @google/genai
    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : m.role,
      parts: [{ text: m.content }]
    }));

    // Multi-turn tool execution loop (up to 5 turns)
    let currentTurn = 0;
    const maxTurns = 5;

    let activeModel = targetModel;

    while (currentTurn < maxTurns) {
      currentTurn++;

      let response;
      try {
        response = await ai.models.generateContent({
          model: activeModel,
          contents,
          config: {
            systemInstruction,
            tools: [{ functionDeclarations: AI_TOOLS }]
          }
        });
      } catch (callErr) {
        // If Google API returns 404 or not found for a specific preview model, gracefully fall back to default
        const isNotFound = callErr.message && (callErr.message.includes('not found') || callErr.message.includes('404') || callErr.status === 404);
        if (isNotFound && activeModel !== DEFAULT_AI_MODEL) {
          console.warn(`⚠️ [AI Engine] Model "${activeModel}" not available on Google API. Gracefully falling back to "${DEFAULT_AI_MODEL}".`);
          activeModel = DEFAULT_AI_MODEL;
          response = await ai.models.generateContent({
            model: DEFAULT_AI_MODEL,
            contents,
            config: {
              systemInstruction,
              tools: [{ functionDeclarations: AI_TOOLS }]
            }
          });
        } else {
          throw callErr;
        }
      }

      const candidate = response.candidates?.[0];
      const content = candidate?.content;
      const functionCalls = content?.parts?.filter(p => p.functionCall)?.map(p => p.functionCall);

      if (!functionCalls || functionCalls.length === 0) {
        // No function calls — Gemini provided a direct natural language response
        const replyText = content?.parts?.map(p => p.text).filter(Boolean).join('\n') || '';
        console.log(`🤖 [AI Response] Model: ${activeModel} | Reply: "${replyText.slice(0, 100)}..." | Mutations: ${triggeredMutations.length}`);
        return res.json({
          success: true,
          data: {
            reply: replyText,
            triggered_mutations: triggeredMutations,
            confirmationData: pendingConfirmation,
            invoiceData: invoiceCardData,
            activeFocus: currentActiveFocus,
            model_used: activeModel
          }
        });
      }

      // Append the model's function call turn to history
      contents.push(content);

      // Execute each function call
      const toolResponseParts = [];
      for (const call of functionCalls) {
        console.log(`⚙️ [AI Tool Call] Function: "${call.name}" | Args:`, JSON.stringify(call.args));
        const toolResult = await executeAiTool(call.name, call.args, {
          tenantId,
          userId: req.user.id
        });

        if (toolResult.error) {
          console.error(`❌ [AI Tool Failed] "${call.name}":`, toolResult.error);
        } else {
          console.log(`✅ [AI Tool Success] "${call.name}" | Mutation:`, toolResult.mutation || 'none');
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
        if (call.name === 'draft_invoice' && toolResult.result?.invoiceId) {
          invoiceCardData = toolResult.result;
          currentActiveFocus = {
            entityType: 'invoice',
            entityId: toolResult.result.invoiceId,
            humanNumber: toolResult.result.invoiceNumber,
            title: `Invoice #${toolResult.result.invoiceNumber}`,
            timestamp: Date.now()
          };
        } else if (call.name === 'create_job' && toolResult.result?.id) {
          currentActiveFocus = {
            entityType: 'job',
            entityId: toolResult.result.id,
            humanNumber: null,
            title: toolResult.result.title,
            timestamp: Date.now()
          };
        } else if (call.name === 'create_client' && toolResult.result?.id) {
          currentActiveFocus = {
            entityType: 'client',
            entityId: toolResult.result.id,
            humanNumber: null,
            title: toolResult.result.name,
            timestamp: Date.now()
          };
        } else if (call.name === 'get_invoice_details' && toolResult.result?.id) {
          currentActiveFocus = {
            entityType: 'invoice',
            entityId: toolResult.result.id,
            humanNumber: toolResult.result.invoice_number,
            title: `Invoice #${toolResult.result.invoice_number}`,
            timestamp: Date.now()
          };
        } else if (call.name === 'get_job_details' && toolResult.result?.job?.id) {
          currentActiveFocus = {
            entityType: 'job',
            entityId: toolResult.result.job.id,
            humanNumber: null,
            title: toolResult.result.job.title,
            timestamp: Date.now()
          };
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
        triggered_mutations: triggeredMutations,
        confirmationData: pendingConfirmation,
        invoiceData: invoiceCardData,
        activeFocus: currentActiveFocus
      }
    });

  } catch (err) {
    next(err);
  }
});

// POST /api/ai/confirm-action — Two-Phase Human-in-the-Loop Execution
router.post('/confirm-action', async (req, res, next) => {
  try {
    const tenantId = req.user?.tenant_id;
    if (!tenantId) {
      return next(createApiError('Tenant context missing from authenticated session', 400, 'TENANT_REQUIRED'));
    }

    const { actionId, confirmed } = req.body;
    if (!actionId) {
      return next(createApiError('Missing actionId', 400, 'BAD_REQUEST'));
    }

    if (!confirmed) {
      pendingActionManager.cancelAction(actionId, tenantId);
      console.log(`🛡️ [AI Confirm Action] Action "${actionId}" cancelled by user.`);
      return res.json({ success: true, message: 'Action cancelled by user.' });
    }

    const action = pendingActionManager.consumeAction(actionId, tenantId);
    if (!action) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Confirmation token expired or already processed.',
          code: 'ACTION_EXPIRED'
        }
      });
    }

    console.log(`🚨 [AI Confirm Action] Executing confirmed action:`, action.actionType, `Target:`, action.targetId);
    let triggeredMutations = [];

    switch (action.actionType) {
      case 'delete_job': {
        const { error } = await supabase
          .from('jobs')
          .delete()
          .eq('id', action.targetId)
          .eq('tenant_id', tenantId);

        if (error) throw error;
        triggeredMutations.push({ type: 'jobs', entityId: action.targetId });
        break;
      }

      case 'delete_client': {
        const { error } = await supabase
          .from('clients')
          .delete()
          .eq('id', action.targetId)
          .eq('tenant_id', tenantId);

        if (error) throw error;
        triggeredMutations.push({ type: 'clients', entityId: action.targetId });
        break;
      }

      case 'void_invoice': {
        const { error } = await supabase
          .from('invoices')
          .update({ status: 'voided' })
          .eq('id', action.targetId)
          .eq('tenant_id', tenantId);

        if (error) throw error;

        await supabase.from('invoice_logs').insert([{
          tenant_id: tenantId,
          invoice_id: action.targetId,
          action: 'Voided',
          reason: 'Voided via AI Action Confirmation'
        }]);

        triggeredMutations.push({ type: 'invoices', entityId: action.targetId });
        break;
      }

      default:
        return next(createApiError('Unknown action type', 400, 'INVALID_ACTION'));
    }

    res.json({
      success: true,
      message: `Successfully executed: ${action.description}`,
      triggered_mutations: triggeredMutations
    });
  } catch (err) {
    next(err);
  }
});

export default router;
