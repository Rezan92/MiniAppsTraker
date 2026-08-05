import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/summary', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const now = new Date();
    
    // Dates for current month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
    
    // Dates for current week (assuming Monday start)
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const startOfWeek = new Date(now.setDate(diff));
    startOfWeek.setHours(0,0,0,0);
    const startOfWeekStr = startOfWeek.toISOString();
    const nextWeekStr = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const todayStr = new Date().toISOString().split('T')[0];

    // 0. Active Clients Count (for empty state)
    const { count: activeClients, error: err0 } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'active');
    if (err0) throw err0;

    // 1. revenueThisMonth
    const { data: paidInvoices, error: err1 } = await supabase
      .from('invoices')
      .select('total_amount')
      .eq('tenant_id', tenantId)
      .eq('status', 'paid')
      .gte('paid_at', startOfMonth)
      .lt('paid_at', nextMonth);
    if (err1) throw err1;
    const revenueThisMonth = paidInvoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);

    // 2. totalOutstanding
    const { data: outstandingInvoices, error: err2 } = await supabase
      .from('invoices')
      .select('total_amount')
      .eq('tenant_id', tenantId)
      .in('status', ['sent', 'overdue']);
    if (err2) throw err2;
    const totalOutstanding = outstandingInvoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);

    // 3. jobsThisWeek
    const { count: jobsThisWeek, error: err3 } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('start_date', startOfWeekStr.split('T')[0])
      .lt('start_date', nextWeekStr.split('T')[0]);
    if (err3) throw err3;

    // 4. jobsThisMonth
    const { count: jobsThisMonth, error: err4 } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('start_date', startOfMonth.split('T')[0])
      .lt('start_date', nextMonth.split('T')[0]);
    if (err4) throw err4;

    // 5. unpaidInvoices
    const { data: unpaidInvoicesList, error: err5 } = await supabase
      .from('invoices')
      .select('id, invoice_number, status, due_date, total_amount, clients(name)')
      .eq('tenant_id', tenantId)
      .in('status', ['draft', 'sent', 'overdue'])
      .order('created_at', { ascending: false });
    if (err5) throw err5;

    // 6. inProgressJobs
    const { data: inProgressJobsList, error: err6 } = await supabase
      .from('jobs')
      .select('id, title, status, start_date, clients(name)')
      .eq('tenant_id', tenantId)
      .eq('status', 'in_progress')
      .order('start_date', { ascending: true });
    if (err6) throw err6;

    // 7. completedJobs
    const { data: completedJobsList, error: err7 } = await supabase
      .from('jobs')
      .select('id, title, status, end_date, clients(name)')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .order('end_date', { ascending: false })
      .limit(50);
    if (err7) throw err7;

    // 8. upcomingJobs
    const { data: upcomingJobsList, error: err8 } = await supabase
      .from('jobs')
      .select('id, title, status, start_date, clients(name)')
      .eq('tenant_id', tenantId)
      .eq('status', 'open')
      .gte('start_date', todayStr)
      .order('start_date', { ascending: true });
    if (err8) throw err8;

    res.json({
      success: true,
      data: {
        activeClients: activeClients || 0,
        revenueThisMonth,
        totalOutstanding,
        jobsThisWeek: jobsThisWeek || 0,
        jobsThisMonth: jobsThisMonth || 0,
        unpaidInvoices: unpaidInvoicesList || [],
        inProgressJobs: inProgressJobsList || [],
        completedJobs: completedJobsList || [],
        upcomingJobs: upcomingJobsList || []
      }
    });

  } catch (err) {
    next(err);
  }
});

export default router;
