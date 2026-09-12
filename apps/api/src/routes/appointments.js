import express from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { createApiError } from '../middleware/errorHandler.js';
import { appointmentService } from '../services/domain/index.js';
import { VALID_COLOR_TAGS } from '../services/domain/appointmentService.js';

const router = express.Router();
router.use(authenticate);

export const createAppointmentSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(255, 'Title cannot exceed 255 characters'),
  description: z.string().optional().nullable(),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required'),
  all_day: z.boolean().optional().default(false),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled', 'rescheduled']).optional().default('scheduled'),
  color_tag: z.enum(VALID_COLOR_TAGS).optional().default('blue'),
  location_address: z.string().optional().nullable(),
  contact_name: z.string().max(255).optional().nullable(),
  contact_phone: z.string().max(50).optional().nullable(),
  contact_role: z.enum(['billing_client', 'site_resident', 'property_manager', 'custom']).optional().default('billing_client'),
  reminder_minutes: z.number().int().min(0).optional().default(60),
  job_id: z.string().uuid('Invalid job ID').optional().nullable().or(z.literal('')).transform(v => v || null),
  client_id: z.string().uuid('Invalid client ID').optional().nullable().or(z.literal('')).transform(v => v || null),
  property_id: z.string().uuid('Invalid property ID').optional().nullable().or(z.literal('')).transform(v => v || null),
  user_id: z.string().uuid('Invalid user ID').optional().nullable().or(z.literal('')).transform(v => v || null)
}).refine(data => {
  const startMs = new Date(data.start_time).getTime();
  const endMs = new Date(data.end_time).getTime();
  return !isNaN(startMs) && !isNaN(endMs) && endMs >= startMs;
}, {
  message: 'End time must be on or after start time',
  path: ['end_time']
});

export const updateAppointmentSchema = z.object({
  title: z.string().trim().min(1, 'Title cannot be empty').max(255).optional(),
  description: z.string().optional().nullable(),
  start_time: z.string().min(1).optional(),
  end_time: z.string().min(1).optional(),
  all_day: z.boolean().optional(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled', 'rescheduled']).optional(),
  color_tag: z.enum(VALID_COLOR_TAGS).optional(),
  location_address: z.string().optional().nullable(),
  contact_name: z.string().max(255).optional().nullable(),
  contact_phone: z.string().max(50).optional().nullable(),
  contact_role: z.enum(['billing_client', 'site_resident', 'property_manager', 'custom']).optional(),
  reminder_minutes: z.number().int().min(0).optional(),
  job_id: z.string().uuid('Invalid job ID').optional().nullable().or(z.literal('')).transform(v => v || null),
  client_id: z.string().uuid('Invalid client ID').optional().nullable().or(z.literal('')).transform(v => v || null),
  property_id: z.string().uuid('Invalid property ID').optional().nullable().or(z.literal('')).transform(v => v || null),
  user_id: z.string().uuid('Invalid user ID').optional().nullable().or(z.literal('')).transform(v => v || null)
}).refine(data => {
  if (data.start_time && data.end_time) {
    const startMs = new Date(data.start_time).getTime();
    const endMs = new Date(data.end_time).getTime();
    return !isNaN(startMs) && !isNaN(endMs) && endMs >= startMs;
  }
  return true;
}, {
  message: 'End time must be on or after start time',
  path: ['end_time']
});

// GET /api/appointments — Fetch date-bounded appointments with interval overlap
router.get('/', async (req, res, next) => {
  try {
    const tenantId = req.user?.tenant_id;
    if (!tenantId) {
      return next(createApiError('Tenant context missing', 400, 'TENANT_REQUIRED'));
    }

    const { start, end, startDate, endDate, jobId, clientId, status } = req.query;

    const data = await appointmentService.getAppointments({
      tenantId,
      startDate: start || startDate,
      endDate: end || endDate,
      jobId,
      clientId,
      status
    });

    res.json({
      success: true,
      data
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/appointments/:id — Fetch single appointment details
router.get('/:id', async (req, res, next) => {
  try {
    const tenantId = req.user?.tenant_id;
    if (!tenantId) {
      return next(createApiError('Tenant context missing', 400, 'TENANT_REQUIRED'));
    }

    const data = await appointmentService.getAppointmentById({
      tenantId,
      appointmentId: req.params.id
    });

    res.json({
      success: true,
      data
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/appointments — Create new appointment
router.post('/', async (req, res, next) => {
  try {
    const tenantId = req.user?.tenant_id;
    if (!tenantId) {
      return next(createApiError('Tenant context missing', 400, 'TENANT_REQUIRED'));
    }

    const parseResult = createAppointmentSchema.safeParse(req.body);
    if (!parseResult.success) {
      return next(parseResult.error);
    }

    const data = await appointmentService.createAppointment({
      tenantId,
      userId: req.user.id,
      appointmentData: parseResult.data
    });

    res.status(201).json({
      success: true,
      data
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/appointments/:id — Update appointment
router.patch('/:id', async (req, res, next) => {
  try {
    const tenantId = req.user?.tenant_id;
    if (!tenantId) {
      return next(createApiError('Tenant context missing', 400, 'TENANT_REQUIRED'));
    }

    const parseResult = updateAppointmentSchema.safeParse(req.body);
    if (!parseResult.success) {
      return next(parseResult.error);
    }

    const data = await appointmentService.updateAppointment({
      tenantId,
      userId: req.user.id,
      appointmentId: req.params.id,
      patchData: parseResult.data
    });

    res.json({
      success: true,
      data
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/appointments/:id — Delete appointment
router.delete('/:id', async (req, res, next) => {
  try {
    const tenantId = req.user?.tenant_id;
    if (!tenantId) {
      return next(createApiError('Tenant context missing', 400, 'TENANT_REQUIRED'));
    }

    const result = await appointmentService.deleteAppointment({
      tenantId,
      userId: req.user.id,
      appointmentId: req.params.id
    });

    res.json({
      success: true,
      message: 'Appointment deleted successfully',
      deletedId: result.deletedId
    });
  } catch (err) {
    next(err);
  }
});

export default router;
