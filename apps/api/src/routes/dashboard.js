import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/summary', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const now = new Date();
    
    // Dates for current month (UTC to prevent timezone boundary bugs)
    const startOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)).toISOString();
    const nextMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1)).toISOString();
    
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
      .select('total_amount, labor_amount, materials_amount')
      .eq('tenant_id', tenantId)
      .eq('status', 'paid')
      .gte('paid_at', startOfMonth)
      .lt('paid_at', nextMonth);
    if (err1) throw err1;
    const revenueThisMonth = paidInvoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
    const laborRevenueThisMonth = paidInvoices.reduce((sum, inv) => sum + Number(inv.labor_amount || 0), 0);
    const materialCostThisMonth = paidInvoices.reduce((sum, inv) => sum + Number(inv.materials_amount || 0), 0);

    // 2. jobsThisMonth
    const { count: jobsThisMonth, error: err4 } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('start_date', startOfMonth.split('T')[0])
      .lt('start_date', nextMonth.split('T')[0]);
    if (err4) throw err4;

    // 3. All Invoices
    const { data: allInvoices, error: err5 } = await supabase
      .from('invoices')
      .select('id, invoice_number, status, due_date, total_amount, labor_amount, materials_amount, clients(name)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    if (err5) throw err5;

    // 4. All Jobs
    const { data: allJobs, error: err6 } = await supabase
      .from('jobs')
      .select('id, title, status, start_date, end_date, clients(name)')
      .eq('tenant_id', tenantId)
      .order('start_date', { ascending: false });
    if (err6) throw err6;

    res.json({
      success: true,
      data: {
        activeClients: activeClients || 0,
        revenueThisMonth,
        laborRevenueThisMonth,
        materialCostThisMonth,
        jobsThisMonth: jobsThisMonth || 0,
        invoices: allInvoices || [],
        jobs: allJobs || []
      }
    });

  } catch (err) {
    next(err);
  }
});

export default router;
