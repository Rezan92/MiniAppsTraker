/**
 * Declarative AI Tool Definitions for Google Gemini Function Calling
 * Uses standard OpenAPI / JSON Schema format supported by @google/genai SDK.
 */

export const AI_TOOLS = [
  {
    name: 'get_dashboard_summary',
    description: 'Retrieve high-level business analytics: count of active clients, recent jobs, and invoice summary.',
    parameters: {
      type: 'OBJECT',
      properties: {}
    }
  },
  {
    name: 'search_clients',
    description: 'Search for clients by name, address, or email. If query is omitted or empty, returns the latest active clients.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: {
          type: 'STRING',
          description: 'Name, email, or address search keyword (optional)'
        }
      }
    }
  },
  {
    name: 'get_client_details',
    description: 'Fetch detailed information about a single client, including their properties and recent jobs.',
    parameters: {
      type: 'OBJECT',
      properties: {
        client_id: {
          type: 'STRING',
          description: 'The UUID of the client'
        }
      },
      required: ['client_id']
    }
  },
  {
    name: 'create_client',
    description: 'Create a new customer/client profile in the CRM.',
    parameters: {
      type: 'OBJECT',
      properties: {
        name: {
          type: 'STRING',
          description: 'Full name or company name of the client'
        },
        email: {
          type: 'STRING',
          description: 'Client email address'
        },
        phone: {
          type: 'STRING',
          description: 'Client phone number (e.g. 555-123-4567)'
        },
        address: {
          type: 'STRING',
          description: 'Physical service address'
        },
        client_type: {
          type: 'STRING',
          enum: ['residential', 'commercial'],
          description: 'Client category (default: residential)'
        },
        notes: {
          type: 'STRING',
          description: 'Optional notes about the client or access instructions'
        }
      },
      required: ['name']
    }
  },
  {
    name: 'update_client',
    description: 'Update an existing client profile with new contact or address information.',
    parameters: {
      type: 'OBJECT',
      properties: {
        client_id: {
          type: 'STRING',
          description: 'The UUID of the client to update'
        },
        name: { type: 'STRING', description: 'Updated client name' },
        email: { type: 'STRING', description: 'Updated email' },
        phone: { type: 'STRING', description: 'Updated phone number' },
        address: { type: 'STRING', description: 'Updated address' },
        notes: { type: 'STRING', description: 'Updated notes' }
      },
      required: ['client_id']
    }
  },
  {
    name: 'list_jobs',
    description: 'Query jobs in the workspace with optional status and client filtering.',
    parameters: {
      type: 'OBJECT',
      properties: {
        status: {
          type: 'STRING',
          enum: ['open', 'in_progress', 'completed', 'on_hold', 'cancelled'],
          description: 'Filter by job status'
        },
        client_id: {
          type: 'STRING',
          description: 'Filter jobs for a specific client UUID'
        },
        limit: {
          type: 'INTEGER',
          description: 'Max number of jobs to return (default 20)'
        }
      }
    }
  },
  {
    name: 'get_job_details',
    description: 'Get comprehensive details for a specific job, including logged labor hours, materials, and linked invoices.',
    parameters: {
      type: 'OBJECT',
      properties: {
        job_id: {
          type: 'STRING',
          description: 'The UUID of the job'
        }
      },
      required: ['job_id']
    }
  },
  {
    name: 'create_job',
    description: 'Dispatch or schedule a new job for an existing client.',
    parameters: {
      type: 'OBJECT',
      properties: {
        client_id: {
          type: 'STRING',
          description: 'The UUID of the client this job is for'
        },
        title: {
          type: 'STRING',
          description: 'Title or description of the job (e.g. "Kitchen Remodel", "Drywall Repair")'
        },
        rate_type: {
          type: 'STRING',
          enum: ['hourly', 'flat'],
          description: 'Billing model: "hourly" or "flat"'
        },
        hourly_rate: {
          type: 'NUMBER',
          description: 'Hourly rate in dollars (optional, defaults to company standard if hourly)'
        },
        flat_rate: {
          type: 'NUMBER',
          description: 'Flat fee in dollars if rate_type is flat'
        },
        start_date: {
          type: 'STRING',
          description: 'Scheduled start date in YYYY-MM-DD format (defaults to today)'
        },
        status: {
          type: 'STRING',
          enum: ['open', 'in_progress', 'completed', 'on_hold', 'cancelled'],
          description: 'Initial job status (default: "open")'
        },
        notes: {
          type: 'STRING',
          description: 'Optional notes, scope of work, or customer special requests'
        }
      },
      required: ['client_id', 'title', 'rate_type']
    }
  },
  {
    name: 'update_job_status',
    description: 'Transition a job to a new operational status.',
    parameters: {
      type: 'OBJECT',
      properties: {
        job_id: {
          type: 'STRING',
          description: 'The UUID of the job'
        },
        status: {
          type: 'STRING',
          enum: ['open', 'in_progress', 'completed', 'on_hold', 'cancelled'],
          description: 'The new status to set'
        }
      },
      required: ['job_id', 'status']
    }
  },
  {
    name: 'log_job_hours',
    description: 'Log labor hours worked on a specific job.',
    parameters: {
      type: 'OBJECT',
      properties: {
        job_id: {
          type: 'STRING',
          description: 'The UUID of the job worked on'
        },
        hours: {
          type: 'NUMBER',
          description: 'Number of hours worked (e.g. 2.5)'
        },
        date: {
          type: 'STRING',
          description: 'Work date in YYYY-MM-DD format'
        },
        description: {
          type: 'STRING',
          description: 'Detailed description of tasks completed during this time'
        },
        start_time: {
          type: 'STRING',
          description: 'Optional start time (e.g. "08:30 AM")'
        },
        end_time: {
          type: 'STRING',
          description: 'Optional end time (e.g. "11:00 AM")'
        }
      },
      required: ['job_id', 'hours', 'date', 'description']
    }
  },
  {
    name: 'log_job_materials',
    description: 'Record material or supply expenses purchased for a specific job.',
    parameters: {
      type: 'OBJECT',
      properties: {
        job_id: {
          type: 'STRING',
          description: 'The UUID of the job'
        },
        description: {
          type: 'STRING',
          description: 'Name or description of materials purchased (e.g. "PVC Pipes and Glue")'
        },
        cost: {
          type: 'NUMBER',
          description: 'Total purchase cost in dollars (e.g. 45.80)'
        },
        store: {
          type: 'STRING',
          description: 'Retailer or supplier name (e.g. "Home Depot", "Lowes")'
        },
        purchase_date: {
          type: 'STRING',
          description: 'Date purchased in YYYY-MM-DD format (defaults to today)'
        },
        notes: {
          type: 'STRING',
          description: 'Optional receipt notes or item numbers'
        },
        is_from_stock: {
          type: 'BOOLEAN',
          description: 'Whether material came from existing inventory stock (default: false)'
        }
      },
      required: ['job_id', 'description', 'cost']
    }
  },

  // --- Invoicing & Billing Tools (Phase 3) ---
  {
    name: 'draft_invoice',
    description: 'Generate a new draft invoice for a job or client. Automatically pulls and calculates all unbilled labor hours and materials using the centralized pricing engine.',
    parameters: {
      type: 'OBJECT',
      properties: {
        client_id: {
          type: 'STRING',
          description: 'UUID of the client to invoice (required)'
        },
        job_id: {
          type: 'STRING',
          description: 'Optional UUID of the job to bill for. If provided, automatically pulls unbilled hours and materials.'
        },
        labor_title: {
          type: 'STRING',
          description: 'Title or description of the primary labor service (e.g. "Drywall and Painting")'
        },
        due_date: {
          type: 'STRING',
          description: 'Due date in YYYY-MM-DD format (defaults to 14 days from today)'
        },
        tax_rate_percent: {
          type: 'NUMBER',
          description: 'Optional sales/service tax percentage (e.g. 8.25 for 8.25%)'
        },
        markup_amount: {
          type: 'NUMBER',
          description: 'Optional flat material markup fee in dollars (e.g. 25.00)'
        },
        notes: {
          type: 'STRING',
          description: 'Optional invoice notes or payment instructions'
        }
      },
      required: ['client_id']
    }
  },
  {
    name: 'add_invoice_line_item',
    description: 'Add an additional ad-hoc labor or material charge line item to an existing draft invoice.',
    parameters: {
      type: 'OBJECT',
      properties: {
        invoice_id: {
          type: 'STRING',
          description: 'UUID of the draft invoice'
        },
        description: {
          type: 'STRING',
          description: 'Description of the item or additional charge'
        },
        amount: {
          type: 'NUMBER',
          description: 'Dollar amount (positive number, e.g. 50.00)'
        },
        source_type: {
          type: 'STRING',
          enum: ['labor', 'material', 'ad_hoc'],
          description: 'Category of the line item'
        }
      },
      required: ['invoice_id', 'description', 'amount']
    }
  },
  {
    name: 'update_invoice_status',
    description: 'Update the status of an invoice (e.g. mark as sent, paid, or voided).',
    parameters: {
      type: 'OBJECT',
      properties: {
        invoice_id: {
          type: 'STRING',
          description: 'UUID of the invoice'
        },
        status: {
          type: 'STRING',
          enum: ['draft', 'sent', 'in_progress', 'paid', 'overdue', 'voided'],
          description: 'Target invoice status matching database check constraint'
        }
      },
      required: ['invoice_id', 'status']
    }
  },
  {
    name: 'get_invoice_details',
    description: 'Fetch detailed invoice data including line items, tax, client info, and payment balance.',
    parameters: {
      type: 'OBJECT',
      properties: {
        invoice_id: {
          type: 'STRING',
          description: 'UUID of the invoice to look up'
        }
      },
      required: ['invoice_id']
    }
  },

  // --- Destructive Action Interceptors (Human-in-the-Loop Safety) ---
  {
    name: 'request_delete_job',
    description: 'Request deletion of a job. Does NOT delete immediately; creates a pending action confirmation card for contractor review and approval.',
    parameters: {
      type: 'OBJECT',
      properties: {
        job_id: {
          type: 'STRING',
          description: 'UUID of the job to delete'
        },
        reason: {
          type: 'STRING',
          description: 'Brief reason for deletion (e.g. "Cancelled by homeowner")'
        }
      },
      required: ['job_id']
    }
  },
  {
    name: 'request_delete_client',
    description: 'Request deletion of a client. Does NOT delete immediately; creates a pending action confirmation card for contractor review and approval.',
    parameters: {
      type: 'OBJECT',
      properties: {
        client_id: {
          type: 'STRING',
          description: 'UUID of the client to delete'
        },
        reason: {
          type: 'STRING',
          description: 'Brief reason for deletion'
        }
      },
      required: ['client_id']
    }
  },
  {
    name: 'request_void_invoice',
    description: 'Request voiding of a finalized or sent invoice. Does NOT void immediately; creates a pending confirmation card for contractor approval.',
    parameters: {
      type: 'OBJECT',
      properties: {
        invoice_id: {
          type: 'STRING',
          description: 'UUID of the invoice to void'
        },
        reason: {
          type: 'STRING',
          description: 'Reason for voiding the invoice'
        }
      },
      required: ['invoice_id']
    }
  }
];
