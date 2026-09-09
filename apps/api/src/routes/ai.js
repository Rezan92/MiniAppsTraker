import express from 'express';
import { z } from 'zod';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';
import { createApiError } from '../middleware/errorHandler.js';
import { supabase } from '../config/supabase.js';
import { ai, DEFAULT_AI_MODEL, getAiClient, getAiConfig } from '../services/ai/geminiClient.js';
import { AI_TOOLS } from '../services/ai/aiToolDefinitions.js';
import { executeAiTool } from '../services/ai/aiToolExecutors.js';
import { buildSystemInstruction } from '../services/ai/promptBuilder.js';
import { pendingActionManager } from '../services/ai/pendingActionManager.js';
import { invoiceService, jobService, clientService } from '../services/domain/index.js';
import { roundCurrency } from '../services/pricingEngine.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/jpg'];
    if (allowedMimes.includes(file.mimetype.toLowerCase()) || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      const err = new Error('Invalid file format. Only JPEG, PNG, WEBP, and HEIC images are supported.');
      err.status = 400;
      cb(err);
    }
  }
});

const DEFAULT_RECEIPT_MODEL = 'gemini-3.1-flash-lite';

const RECEIPT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    store: {
      type: 'STRING',
      description: 'Store or merchant name, e.g. Home Depot, Lowe\'s, Menards, Ace Hardware'
    },
    date: {
      type: 'STRING',
      description: 'Receipt purchase date in YYYY-MM-DD format if visible, otherwise null'
    },
    totalAmount: {
      type: 'NUMBER',
      description: 'Total receipt monetary amount'
    },
    items: {
      type: 'ARRAY',
      description: 'List of purchased physical materials, supplies, tools, or items',
      items: {
        type: 'OBJECT',
        properties: {
          description: {
            type: 'STRING',
            description: 'Specific name or description of the purchased material or item. Expand supplier shorthand if obvious.'
          },
          quantity: {
            type: 'NUMBER',
            description: 'Item quantity purchased, default 1'
          },
          unitPrice: {
            type: 'NUMBER',
            description: 'Price per unit if available'
          },
          cost: {
            type: 'NUMBER',
            description: 'Total line cost (quantity * unitPrice) for this item'
          }
        },
        required: ['description', 'cost']
      }
    }
  },
  required: ['items']
};

const router = express.Router();
router.use(authenticate);

// GET /api/ai/config — Retrieve configured AI capabilities and active tiers
router.get('/config', (req, res) => {
  res.json({
    success: true,
    data: getAiConfig()
  });
});

const chatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'model', 'assistant']),
    content: z.string().optional().default(''),
    attachment: z.object({
      mimeType: z.string(),
      data: z.string(),
      name: z.string().optional()
    }).optional().nullable()
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
  model: z.string().optional(),
  tier: z.enum(['free', 'paid']).optional().default('free')
});

router.post('/chat', async (req, res, next) => {
  try {
    const tenantId = req.user?.tenant_id;
    if (!tenantId) {
      return next(createApiError('Tenant context missing from authenticated session', 400, 'TENANT_REQUIRED'));
    }

    const config = getAiConfig();
    if (!config.hasFreeKey && !config.hasPaidKey) {
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

    const { messages, screenContext, activeFocus, model, tier } = parseResult.data;
    const { ai: aiClient, activeTier, isPaidKeyConfigured } = getAiClient(tier);
    const targetModel = model || DEFAULT_AI_MODEL;
    const lastUserMsg = messages[messages.length - 1]?.content || '(image attachment)';
    console.log(`\n🤖 [AI Request] Tier: ${activeTier.toUpperCase()} | Model: ${targetModel} | User: ${req.user.email} | Screen: ${screenContext?.screen || 'Global'} | Prompt: "${lastUserMsg}"`);

    let currentActiveFocus = activeFocus || null;
    const systemInstruction = buildSystemInstruction({ user: req.user, screenContext, activeFocus: currentActiveFocus });
    const triggeredMutations = [];
    let pendingConfirmation = null;
    let invoiceCardData = null;

    // Format chat history for @google/genai (supporting multimodal attachments)
    const contents = messages.map(m => {
      const parts = [];
      if (m.attachment?.data && m.attachment?.mimeType) {
        const rawBase64 = m.attachment.data.includes('base64,')
          ? m.attachment.data.split('base64,')[1]
          : m.attachment.data;

        parts.push({
          inlineData: {
            mimeType: m.attachment.mimeType,
            data: rawBase64
          }
        });
      }

      if (m.content && m.content.trim()) {
        parts.push({ text: m.content });
      } else if (parts.length === 0) {
        parts.push({ text: ' ' });
      }

      return {
        role: m.role === 'assistant' ? 'model' : m.role,
        parts
      };
    });

    // Multi-turn tool execution loop (up to 5 turns)
    let currentTurn = 0;
    const maxTurns = 5;

    let activeModel = targetModel;

    while (currentTurn < maxTurns) {
      currentTurn++;

      let response;
      try {
        response = await aiClient.models.generateContent({
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
          response = await aiClient.models.generateContent({
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
        console.log(`🤖 [AI Response] Tier: ${activeTier.toUpperCase()} | Model: ${activeModel} | Reply: "${replyText.slice(0, 100)}..." | Mutations: ${triggeredMutations.length}`);
        return res.json({
          success: true,
          data: {
            reply: replyText,
            triggered_mutations: triggeredMutations,
            confirmationData: pendingConfirmation,
            invoiceData: invoiceCardData,
            activeFocus: currentActiveFocus,
            model_used: activeModel,
            tier_used: activeTier,
            is_paid_configured: isPaidKeyConfigured
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
        activeFocus: currentActiveFocus,
        model_used: activeModel,
        tier_used: activeTier,
        is_paid_configured: isPaidKeyConfigured
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
        await jobService.deleteJob({
          tenantId,
          userId: req.user.id,
          jobId: action.targetId
        });
        triggeredMutations.push({ type: 'jobs', entityId: action.targetId });
        break;
      }

      case 'delete_client': {
        await clientService.deleteClient({
          tenantId,
          userId: req.user.id,
          clientId: action.targetId
        });
        triggeredMutations.push({ type: 'clients', entityId: action.targetId });
        break;
      }

      case 'delete_invoice': {
        const result = await invoiceService.deleteDraftInvoice({
          tenantId,
          userId: req.user.id,
          invoiceId: action.targetId
        });

        triggeredMutations.push(
          { type: 'invoices', entityId: action.targetId },
          { type: 'jobs', entityId: result.deletedInvoice.job_id },
          { type: 'hours', entityId: result.deletedInvoice.job_id },
          { type: 'materials', entityId: result.deletedInvoice.job_id }
        );
        break;
      }

      case 'void_invoice': {
        const updatedInvoice = await invoiceService.updateInvoiceStatus({
          tenantId,
          userId: req.user.id,
          invoiceId: action.targetId,
          status: 'voided',
          reason: action.description || 'Voided via AI Action Confirmation'
        });

        triggeredMutations.push(
          { type: 'invoices', entityId: action.targetId },
          { type: 'jobs', entityId: updatedInvoice.job_id },
          { type: 'hours', entityId: updatedInvoice.job_id },
          { type: 'materials', entityId: updatedInvoice.job_id }
        );
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

// POST /api/ai/receipt — Multimodal Receipt OCR & Extraction
router.post('/receipt', upload.single('file'), async (req, res, next) => {
  try {
    const tenantId = req.user?.tenant_id;
    if (!tenantId) {
      return next(createApiError('Tenant context missing from authenticated session', 400, 'TENANT_REQUIRED'));
    }

    if (!req.file) {
      return next(createApiError('Receipt image file is required', 400, 'FILE_REQUIRED'));
    }

    const tier = req.body.tier === 'paid' ? 'paid' : 'free';
    const requestedModel = req.body.model || DEFAULT_RECEIPT_MODEL;
    const { ai: aiClient, activeTier } = getAiClient(tier);

    console.log(`\n📸 [Receipt Vision Request] Tier: ${activeTier.toUpperCase()} | Model: ${requestedModel} | File: ${req.file.originalname} (${(req.file.size / 1024).toFixed(1)} KB)`);

    const visionInstruction = `You are an expert OCR and procurement assistant for residential contractors, electricians, plumbers, and trade professionals.
Analyze the provided receipt image and extract structured purchase details.
Guidelines:
1. ONLY extract physical materials, tools, parts, hardware, supplies, and equipment purchased.
2. EXCLUDE sales tax, subtotal lines, tender lines (Cash/Credit/Debit), change due, store discounts, and loyalty savings as line items.
3. If an item line shows a discount or return, adjust the cost to reflect the final net cost paid for that item.
4. Expand cryptic hardware/lumber/trade abbreviations into clean, professional descriptions (e.g. "2x4x8 SPF Stud", "1/2 in EMT Conduit", "Romex 12/2 250ft", "Wire Nuts 100pk").
5. If the store name or purchase date is clearly legible, extract it. Otherwise, set date to null.`;

    const contents = [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: req.file.mimetype || 'image/jpeg',
              data: req.file.buffer.toString('base64')
            }
          },
          {
            text: 'Extract all purchased materials, items, merchant name, purchase date, and total amount from this receipt image. Ensure each item has a specific description and non-negative cost.'
          }
        ]
      }
    ];

    let activeModel = requestedModel;
    let response;

    try {
      response = await aiClient.models.generateContent({
        model: activeModel,
        contents,
        config: {
          systemInstruction: visionInstruction,
          responseMimeType: 'application/json',
          responseSchema: RECEIPT_SCHEMA
        }
      });
    } catch (callErr) {
      const isNotFound = callErr.message && (callErr.message.includes('not found') || callErr.message.includes('404') || callErr.status === 404);
      if (isNotFound && activeModel !== DEFAULT_AI_MODEL) {
        console.warn(`⚠️ [Receipt Vision] Model "${activeModel}" not available on Google API. Gracefully falling back to "${DEFAULT_AI_MODEL}".`);
        activeModel = DEFAULT_AI_MODEL;
        response = await aiClient.models.generateContent({
          model: DEFAULT_AI_MODEL,
          contents,
          config: {
            systemInstruction: visionInstruction,
            responseMimeType: 'application/json',
            responseSchema: RECEIPT_SCHEMA
          }
        });
      } else {
        throw callErr;
      }
    }

    const responseText = response.text || response.candidates?.[0]?.content?.parts?.map(p => p.text).filter(Boolean).join('');
    if (!responseText) {
      return next(createApiError('No response received from vision model', 502, 'AI_NO_RESPONSE'));
    }

    let parsedReceipt;
    try {
      parsedReceipt = JSON.parse(responseText);
    } catch (pErr) {
      console.error('Failed to parse Gemini receipt JSON output:', responseText, pErr);
      return next(createApiError('Failed to parse structured receipt data from vision model', 502, 'AI_PARSING_FAILED'));
    }

    const items = (parsedReceipt.items || []).map(item => ({
      description: item.description || 'General Material',
      quantity: Number(item.quantity) || 1,
      unitPrice: item.unitPrice ? roundCurrency(item.unitPrice) : null,
      cost: roundCurrency(item.cost || 0)
    }));

    const calculatedTotal = roundCurrency(items.reduce((acc, curr) => acc + curr.cost, 0));
    const totalAmount = parsedReceipt.totalAmount ? roundCurrency(parsedReceipt.totalAmount) : calculatedTotal;

    console.log(`📸 [Receipt Vision Success] Parsed ${items.length} items from ${parsedReceipt.store || 'Unknown'} (Total: $${totalAmount})`);

    res.json({
      success: true,
      data: {
        receipt: {
          store: parsedReceipt.store || null,
          date: parsedReceipt.date || null,
          totalAmount,
          items
        },
        suggestedJobId: req.body.jobId || null,
        model_used: activeModel,
        tier_used: activeTier
      }
    });
  } catch (err) {
    next(err);
  }
});

const commitReceiptSchema = z.object({
  jobId: z.string().min(1, 'Target Job ID is required'),
  store: z.string().optional().nullable(),
  purchaseDate: z.string().optional().nullable(),
  items: z.array(z.object({
    description: z.string().min(1, 'Description is required'),
    cost: z.number().nonnegative('Cost must be non-negative'),
    notes: z.string().optional().nullable(),
    is_from_stock: z.boolean().optional().default(false)
  })).min(1, 'At least one material item is required')
});

// POST /api/ai/receipt/commit — Atomic Batch Commit to job_materials
router.post('/receipt/commit', async (req, res, next) => {
  try {
    const tenantId = req.user?.tenant_id;
    if (!tenantId) {
      return next(createApiError('Tenant context missing from authenticated session', 400, 'TENANT_REQUIRED'));
    }

    const parseResult = commitReceiptSchema.safeParse(req.body);
    if (!parseResult.success) {
      return next(parseResult.error);
    }

    const { jobId, store, purchaseDate, items } = parseResult.data;

    const result = await jobService.logJobMaterialsBatch({
      tenantId,
      userId: req.user.id,
      jobId,
      items,
      store,
      purchaseDate
    });

    console.log(`📦 [Receipt Commit] Successfully logged ${result.count} materials to Job ${jobId}`);

    res.json({
      success: true,
      count: result.count,
      jobId,
      triggered_mutations: [
        { type: 'materials', entityId: jobId },
        { type: 'jobs', entityId: jobId }
      ]
    });
  } catch (err) {
    next(err);
  }
});

export default router;
