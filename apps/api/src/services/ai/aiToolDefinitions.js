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
          description: 'UUID, full name, or company name of the client'
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
    description: 'Get comprehensive details for a specific job, including logged labor hours, materials, unbilled work breakdown, and linked invoices (draft, sent, paid).',
    parameters: {
      type: 'OBJECT',
      properties: {
        job_id: {
          type: 'STRING',
          description: 'UUID or title of the job'
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
          description: 'UUID, full name, or company name of the client this job is for'
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
          description: 'UUID or title of the job'
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
          description: 'UUID or title of the job worked on'
        },
        hours: {
          type: 'NUMBER',
          description: 'Number of hours worked (e.g. 2.5)'
        },
        date: {
          type: 'STRING',
          description: 'Work date in YYYY-MM-DD format (defaults to today if omitted)'
        },
        description: {
          type: 'STRING',
          description: 'Description of work or tasks completed'
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
      required: ['job_id', 'hours', 'description']
    }
  },
  {
    name: 'update_job_hours',
    description: 'Update an existing logged work hours entry for a job (e.g. adjust hours worked, work date, start/end time, or task description). Targets the entry by UUID, work date, or task description keyword. Cannot modify entries linked to draft or billed invoices.',
    parameters: {
      type: 'OBJECT',
      properties: {
        job_id: {
          type: 'STRING',
          description: 'UUID or title of the job'
        },
        hour_id: {
          type: 'STRING',
          description: 'Optional UUID, work date (e.g. "2026-05-22"), or task description of the hours record. If omitted, targets the most recent hours entry.'
        },
        hours: {
          type: 'NUMBER',
          description: 'Updated number of hours worked (e.g. 4.5)'
        },
        date: {
          type: 'STRING',
          description: 'Updated work date in YYYY-MM-DD format'
        },
        description: {
          type: 'STRING',
          description: 'Updated description of work completed'
        },
        start_time: {
          type: 'STRING',
          description: 'Updated start time (e.g. "08:30 AM")'
        },
        end_time: {
          type: 'STRING',
          description: 'Updated end time (e.g. "01:00 PM")'
        }
      },
      required: ['job_id']
    }
  },
  {
    name: 'delete_job_hours',
    description: 'Delete a logged work hours entry from a job. Cannot delete entries attached to a draft invoice (on_draft) or finalized invoice (billed).',
    parameters: {
      type: 'OBJECT',
      properties: {
        job_id: {
          type: 'STRING',
          description: 'UUID or title of the job'
        },
        hour_id: {
          type: 'STRING',
          description: 'UUID, work date, or task description keyword identifying the hours record to delete'
        }
      },
      required: ['job_id', 'hour_id']
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
          description: 'UUID or title of the job'
        },
        description: {
          type: 'STRING',
          description: 'Name or description of materials purchased (e.g. "1/2 inch copper pipe")'
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
  {
    name: 'log_job_materials_batch',
    description: 'Record multiple separate material or supply expenses for a specific job in a single batch.',
    parameters: {
      type: 'OBJECT',
      properties: {
        job_id: {
          type: 'STRING',
          description: 'UUID or title of the target job'
        },
        store: {
          type: 'STRING',
          description: 'Retailer or supplier name (e.g. "The Home Depot", "Lowe\'s")'
        },
        purchase_date: {
          type: 'STRING',
          description: 'Date purchased in YYYY-MM-DD format (defaults to today)'
        },
        items: {
          type: 'ARRAY',
          description: 'List of material items to log',
          items: {
            type: 'OBJECT',
            properties: {
              description: {
                type: 'STRING',
                description: 'Name or description of the material or tool'
              },
              cost: {
                type: 'NUMBER',
                description: 'Total line cost in dollars'
              },
              notes: {
                type: 'STRING',
                description: 'Optional line notes or quantity'
              }
            },
            required: ['description', 'cost']
          }
        }
      },
      required: ['job_id', 'items']
    }
  },
  {
    name: 'update_job_material',
    description: 'Update an existing material/expense item on a job by name, description, cost, or UUID (e.g. change price, description, store, or notes). Cannot modify items linked to draft or billed invoices.',
    parameters: {
      type: 'OBJECT',
      properties: {
        job_id: {
          type: 'STRING',
          description: 'UUID or title of the job'
        },
        material_id: {
          type: 'STRING',
          description: 'UUID, item name (e.g. "Homer Bucket", "sponge"), or price of the material to update'
        },
        description: {
          type: 'STRING',
          description: 'Updated item description or material name'
        },
        cost: {
          type: 'NUMBER',
          description: 'Updated total purchase cost in dollars'
        },
        store: {
          type: 'STRING',
          description: 'Updated retailer or supplier name (e.g. "Home Depot")'
        },
        purchase_date: {
          type: 'STRING',
          description: 'Updated purchase date in YYYY-MM-DD format'
        },
        notes: {
          type: 'STRING',
          description: 'Updated receipt notes'
        },
        is_from_stock: {
          type: 'BOOLEAN',
          description: 'Whether material came from inventory stock'
        }
      },
      required: ['job_id', 'material_id']
    }
  },
  {
    name: 'delete_job_material',
    description: 'Delete a material/expense item from a job. Cannot delete items attached to a draft invoice (on_draft) or finalized invoice (billed).',
    parameters: {
      type: 'OBJECT',
      properties: {
        job_id: {
          type: 'STRING',
          description: 'UUID or title of the job'
        },
        material_id: {
          type: 'STRING',
          description: 'UUID, item name (e.g. "Homer Bucket", "sponge"), or description of the material to delete'
        }
      },
      required: ['job_id', 'material_id']
    }
  },

  // --- Invoicing & Billing Tools (Phase 3) ---
  {
    name: 'draft_invoice',
    description: 'Generate a new draft invoice for a job or client. Automatically pulls and calculates all unbilled labor hours and materials using the centralized pricing engine. Preserves the exact original descriptions of labor and materials entries without alteration.',
    parameters: {
      type: 'OBJECT',
      properties: {
        job_id: {
          type: 'STRING',
          description: 'UUID of the job to bill for. Automatically resolves the client, unbilled hours, and unbilled materials.'
        },
        client_id: {
          type: 'STRING',
          description: 'UUID of the client to invoice (optional if job_id is provided)'
        },
        labor_title: {
          type: 'STRING',
          description: 'Optional labor title (defaults to the linked job title if omitted)'
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
      }
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
    name: 'add_unbilled_items_to_invoice',
    description: 'Appends all unbilled labor hours and materials from a job to an existing draft invoice. Automatically calculates rates, preserves verbatim descriptions, locks items to "on_draft", and recalculates invoice totals.',
    parameters: {
      type: 'OBJECT',
      properties: {
        invoice_id: {
          type: 'STRING',
          description: 'UUID or invoice number of the draft invoice (e.g. "1002" or UUID)'
        },
        job_id: {
          type: 'STRING',
          description: 'Optional UUID or title of the job (defaults to the invoice linked job if omitted)'
        }
      },
      required: ['invoice_id']
    }
  },
  {
    name: 'update_invoice_status',
    description: 'Update the status of an invoice (e.g. mark as sent, paid, or revert to draft).',
    parameters: {
      type: 'OBJECT',
      properties: {
        invoice_id: {
          type: 'STRING',
          description: 'UUID or invoice number of the invoice'
        },
        status: {
          type: 'STRING',
          enum: ['draft', 'sent', 'in_progress', 'paid', 'overdue', 'voided'],
          description: 'Target invoice status matching database check constraint'
        },
        reason: {
          type: 'STRING',
          description: 'Optional explanation for the status change (required when reverting to draft, voiding, or disputing)'
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
          description: 'UUID, invoice number (e.g. "1027" or "INV-1027"), or job title of the invoice to look up'
        }
      },
      required: ['invoice_id']
    }
  },
  {
    name: 'search_invoices',
    description: 'Search for invoices by invoice number, client name, or job title. Returns matching invoices with status and total amount.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: {
          type: 'STRING',
          description: 'Invoice number (e.g. "1027"), client name, or job title search keyword'
        },
        status: {
          type: 'STRING',
          enum: ['draft', 'sent', 'in_progress', 'paid', 'overdue', 'voided'],
          description: 'Optional invoice status filter'
        }
      },
      required: ['query']
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
          description: 'UUID or title of the job to delete (e.g. "Kitchen Remodel")'
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
          description: 'UUID or name/company of the client to delete'
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
    name: 'request_delete_invoice',
    description: 'Request deletion of an invoice that is in draft, ready_to_send, or disputed status. Does NOT delete immediately; creates a pending action confirmation card for contractor review and approval. Automatically reverts all associated job labor hours and materials back to unbilled status.',
    parameters: {
      type: 'OBJECT',
      properties: {
        invoice_id: {
          type: 'STRING',
          description: 'UUID or human invoice number (e.g. "1027" or "INV-1027") of the invoice to delete'
        },
        reason: {
          type: 'STRING',
          description: 'Optional reason for deleting the invoice'
        }
      },
      required: ['invoice_id']
    }
  },
  {
    name: 'request_void_invoice',
    description: 'Request voiding of a finalized, sent, or paid invoice. Cannot be used for draft or disputed invoices (draft or disputed invoices must be deleted instead). Does NOT void immediately; creates a pending confirmation card for contractor approval.',
    parameters: {
      type: 'OBJECT',
      properties: {
        invoice_id: {
          type: 'STRING',
          description: 'UUID or human invoice number (e.g. "1027" or "INV-1027") of the invoice to void'
        },
        reason: {
          type: 'STRING',
          description: 'Reason for voiding the invoice'
        }
      },
      required: ['invoice_id']
    }
  },

  // --- Calendar & Scheduling Hub Tools (Epic 18) ---
  {
    name: 'list_appointments',
    description: 'Retrieve scheduled calendar events and appointments within a date range (e.g. today, a specific week, month, or custom start/end dates), with optional status, client, or job filters.',
    parameters: {
      type: 'OBJECT',
      properties: {
        start_date: {
          type: 'STRING',
          description: 'Start date or ISO timestamp (e.g. "2026-09-15" or "2026-09-15T00:00:00Z")'
        },
        end_date: {
          type: 'STRING',
          description: 'End date or ISO timestamp (e.g. "2026-09-22" or "2026-09-22T23:59:59Z")'
        },
        status: {
          type: 'STRING',
          enum: ['scheduled', 'in_progress', 'completed', 'cancelled', 'rescheduled'],
          description: 'Filter by appointment status'
        },
        client_id: {
          type: 'STRING',
          description: 'Filter by client name, company, or UUID'
        },
        job_id: {
          type: 'STRING',
          description: 'Filter by job title or UUID'
        },
        limit: {
          type: 'INTEGER',
          description: 'Maximum number of appointments to return (default 50)'
        }
      }
    }
  },
  {
    name: 'get_appointment_details',
    description: 'Get detailed information for a specific calendar appointment, including linked client, job, property, contact details, notes, and color tag.',
    parameters: {
      type: 'OBJECT',
      properties: {
        appointment_id: {
          type: 'STRING',
          description: 'UUID, title, or contact name of the appointment to look up'
        }
      },
      required: ['appointment_id']
    }
  },
  {
    name: 'create_appointment',
    description: 'Schedule a new calendar appointment or event. Sets start and end times, title, color tag, linked customer, job, location, and contact information.',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: {
          type: 'STRING',
          description: 'Title or purpose of the appointment (e.g. "HVAC Inspection", "Dave Walkthrough")'
        },
        start_time: {
          type: 'STRING',
          description: 'Start date-time in ISO 8601 format (e.g. "2026-09-15T09:00:00Z" or "2026-09-15 09:00")'
        },
        end_time: {
          type: 'STRING',
          description: 'End date-time in ISO 8601 format (e.g. "2026-09-15T10:00:00Z"). If omitted, default to 1 hour after start_time.'
        },
        all_day: {
          type: 'BOOLEAN',
          description: 'True if this is an all-day event (default false)'
        },
        color_tag: {
          type: 'STRING',
          description: 'Color tag for the event (e.g. "blue", "flamingo", "tomato", "basil", "grape", "banana", "amber", "green", etc. Default "blue")'
        },
        client_id: {
          type: 'STRING',
          description: 'Optional client name, company, or UUID to link'
        },
        job_id: {
          type: 'STRING',
          description: 'Optional job title or UUID to link'
        },
        property_id: {
          type: 'STRING',
          description: 'Optional rental property UUID to link'
        },
        location_address: {
          type: 'STRING',
          description: 'Physical address for the appointment'
        },
        contact_name: {
          type: 'STRING',
          description: 'Name of the on-site contact person or resident'
        },
        contact_phone: {
          type: 'STRING',
          description: 'Phone number for the appointment contact'
        },
        contact_role: {
          type: 'STRING',
          enum: ['billing_client', 'site_resident', 'property_manager', 'custom'],
          description: 'Role of the contact person (default: billing_client)'
        },
        description: {
          type: 'STRING',
          description: 'Special notes, gate codes, tools, or instructions'
        },
        reminder_minutes: {
          type: 'INTEGER',
          description: 'Minutes before event to remind (e.g. 15, 30, 60, 1440. Default 60)'
        }
      },
      required: ['title', 'start_time']
    }
  },
  {
    name: 'reschedule_appointment',
    description: 'Move, reschedule, or change the date and time of an existing calendar event. If new end_time is not provided, automatically preserves the original event duration.',
    parameters: {
      type: 'OBJECT',
      properties: {
        appointment_id: {
          type: 'STRING',
          description: 'UUID, title, or contact name of the appointment to move'
        },
        start_time: {
          type: 'STRING',
          description: 'New start date-time in ISO format (e.g. "2026-09-16T14:00:00Z")'
        },
        end_time: {
          type: 'STRING',
          description: 'Optional new end date-time in ISO format. If omitted, preserves original duration.'
        },
        all_day: {
          type: 'BOOLEAN',
          description: 'Whether the event is now an all-day event'
        },
        reason: {
          type: 'STRING',
          description: 'Optional explanation for rescheduling'
        }
      },
      required: ['appointment_id', 'start_time']
    }
  },
  {
    name: 'update_appointment',
    description: 'Update non-time details of an existing calendar appointment, such as title, notes, color tag, status, address, contact, or linked client/job.',
    parameters: {
      type: 'OBJECT',
      properties: {
        appointment_id: {
          type: 'STRING',
          description: 'UUID, title, or contact name of the appointment to update'
        },
        title: {
          type: 'STRING',
          description: 'New title for the appointment'
        },
        description: {
          type: 'STRING',
          description: 'Updated notes, gate codes, or instructions'
        },
        status: {
          type: 'STRING',
          enum: ['scheduled', 'in_progress', 'completed', 'cancelled', 'rescheduled'],
          description: 'Updated appointment status'
        },
        color_tag: {
          type: 'STRING',
          description: 'Updated color tag (e.g. "blue", "flamingo", "tomato", "basil", "grape", etc.)'
        },
        location_address: {
          type: 'STRING',
          description: 'Updated location address'
        },
        contact_name: {
          type: 'STRING',
          description: 'Updated contact person name'
        },
        contact_phone: {
          type: 'STRING',
          description: 'Updated contact phone number'
        },
        client_id: {
          type: 'STRING',
          description: 'Updated linked client UUID or name'
        },
        job_id: {
          type: 'STRING',
          description: 'Updated linked job UUID or title'
        }
      },
      required: ['appointment_id']
    }
  },
  {
    name: 'delete_appointment',
    description: 'Delete or remove a scheduled appointment/event from the calendar.',
    parameters: {
      type: 'OBJECT',
      properties: {
        appointment_id: {
          type: 'STRING',
          description: 'UUID, title, or contact name of the appointment to delete'
        },
        reason: {
          type: 'STRING',
          description: 'Optional reason for cancellation/deletion'
        }
      },
      required: ['appointment_id']
    }
  }
];
