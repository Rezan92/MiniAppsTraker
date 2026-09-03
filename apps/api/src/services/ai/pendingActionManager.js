import { randomUUID } from 'crypto';

// In-memory registry with TTL (10 minutes)
const pendingActions = new Map();
const ACTION_TTL_MS = 10 * 60 * 1000;

export const pendingActionManager = {
  createAction({ tenantId, userId, actionType, targetId, description, impactSummary }) {
    const actionId = `act_${randomUUID()}`;
    const actionData = {
      actionId,
      tenantId,
      userId,
      actionType,
      targetId,
      description,
      impactSummary,
      createdAt: Date.now(),
      expiresAt: Date.now() + ACTION_TTL_MS
    };

    pendingActions.set(actionId, actionData);
    return actionData;
  },

  getAction(actionId) {
    const action = pendingActions.get(actionId);
    if (!action) return null;
    if (Date.now() > action.expiresAt) {
      pendingActions.delete(actionId);
      return null;
    }
    return action;
  },

  consumeAction(actionId, tenantId) {
    const action = this.getAction(actionId);
    if (!action) return null;
    if (action.tenantId !== tenantId) {
      throw new Error('Tenant security mismatch on confirmation token');
    }
    pendingActions.delete(actionId);
    return action;
  },

  cancelAction(actionId, tenantId) {
    const action = pendingActions.get(actionId);
    if (action && action.tenantId === tenantId) {
      pendingActions.delete(actionId);
      return true;
    }
    return false;
  }
};
