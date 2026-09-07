/**
 * Centralized Query Keys Single Source of Truth for TanStack React Query v5.
 * Following hierarchical tuple structures to enable precise prefix-matching invalidations.
 */

export const QUERY_KEYS = {
  clients: {
    all: ['clients'],
    lists: () => ['clients', 'list'],
    list: (search = '') => ['clients', 'list', { search: search || '' }],
    details: () => ['clients', 'detail'],
    detail: (id) => ['clients', 'detail', String(id)],
  },
  properties: {
    all: ['properties'],
    lists: () => ['properties', 'list'],
    list: (filters = {}) => ['properties', 'list', filters],
    listByClient: (clientId) => ['properties', 'list', { clientId: String(clientId) }],
    details: () => ['properties', 'detail'],
    detail: (id) => ['properties', 'detail', String(id)],
  },
  jobs: {
    all: ['jobs'],
    lists: () => ['jobs', 'list'],
    list: (filters = {}) => ['jobs', 'list', filters],
    listByClient: (clientId) => ['jobs', 'list', { client_id: String(clientId) }],
    listByProperty: (propertyId) => ['jobs', 'list', { property_id: String(propertyId) }],
    details: () => ['jobs', 'detail'],
    detail: (id) => ['jobs', 'detail', String(id)],
    hours: (jobId, showBilled = false) => ['jobs', 'detail', String(jobId), 'hours', { showBilled: !!showBilled }],
    allHours: (jobId) => jobId ? ['jobs', 'detail', String(jobId), 'hours'] : ['jobs', 'hours'],
    materials: (jobId, showBilled = false) => ['jobs', 'detail', String(jobId), 'materials', { showBilled: !!showBilled }],
    allMaterials: (jobId) => jobId ? ['jobs', 'detail', String(jobId), 'materials'] : ['jobs', 'materials'],
  },
  invoices: {
    all: ['invoices'],
    lists: () => ['invoices', 'list'],
    list: (filters = {}) => ['invoices', 'list', filters],
    details: () => ['invoices', 'detail'],
    detail: (id) => ['invoices', 'detail', String(id)],
    logs: (id) => ['invoices', 'detail', String(id), 'logs'],
  },
  dashboard: {
    all: ['dashboard'],
    summary: (tenantId) => ['dashboard', 'summary', tenantId || 'current'],
  },
  workspaces: {
    all: ['workspaces'],
    detail: (id) => ['workspaces', 'detail', String(id)],
  },
  team: {
    all: ['team'],
    members: (tenantId) => ['team', 'members', tenantId],
    invitations: () => ['team', 'invitations'],
  }
};
