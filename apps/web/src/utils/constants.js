export const STATUS_COLORS = {
  open: 'bg-blue-50 text-blue-700 border-blue-200',
  in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  on_hold: 'bg-gray-100 text-gray-700 border-gray-300',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
  draft: 'bg-gray-100 text-gray-700 border-gray-300',
  sent: 'bg-blue-50 text-blue-700 border-blue-200',
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  overdue: 'bg-red-50 text-red-700 border-red-200',
  voided: 'bg-gray-200 text-gray-800 border-gray-400',
  disputed: 'bg-amber-50 text-amber-700 border-amber-200'
};

export const JOB_STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'cancelled', label: 'Cancelled' }
];

export const JOB_FILTER_TABS = [
  { value: 'all', label: 'All' },
  ...JOB_STATUSES
];

export const INVOICE_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'voided', label: 'Voided' },
  { value: 'disputed', label: 'Disputed' }
];

export const INVOICE_FILTER_TABS = [
  { value: 'all', label: 'All' },
  ...INVOICE_STATUSES
];
