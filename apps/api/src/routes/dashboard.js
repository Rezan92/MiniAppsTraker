import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate } from '../middleware/auth.js';
import { roundCurrency } from '../services/pricingEngine.js';

const router = express.Router();
router.use(authenticate);

router.get('/summary', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const now = new Date();
    
    // Dates for current month (UTC to prevent timezone boundary bugs)
    const startOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)).toISOString();
    const nextMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1)).toISOString();
    
    // Run all independent queries concurrently for high performance
    const [
      activeClientsResult,
      paidInvoicesResult,
      jobsThisMonthResult,
      allInvoicesResult,
      allJobsResult
    ] = await Promise.all([
      // 0. Active Clients Count
      supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('status', 'active'),
      
      // 1. Paid Invoices this month
      supabase
        .from('invoices')
        .select('total_amount, labor_amount, materials_amount')
        .eq('tenant_id', tenantId)
        .eq('status', 'paid')
        .gte('paid_at', startOfMonth)
        .lt('paid_at', nextMonth),

      // 2. Jobs started this month
      supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('start_date', startOfMonth.split('T')[0])
        .lt('start_date', nextMonth.split('T')[0]),

      // 3. All Invoices
      supabase
        .from('invoices')
        .select('id, invoice_number, status, due_date, total_amount, labor_amount, materials_amount, clients(name)')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false }),

      // 4. All Jobs
      supabase
        .from('jobs')
        .select('id, title, status, start_date, end_date, clients(name)')
        .eq('tenant_id', tenantId)
        .order('start_date', { ascending: false })
    ]);

    if (activeClientsResult.error) throw activeClientsResult.error;
    if (paidInvoicesResult.error) throw paidInvoicesResult.error;
    if (jobsThisMonthResult.error) throw jobsThisMonthResult.error;
    if (allInvoicesResult.error) throw allInvoicesResult.error;
    if (allJobsResult.error) throw allJobsResult.error;

    const paidInvoices = paidInvoicesResult.data || [];
    const revenueThisMonth = roundCurrency(paidInvoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0));
    const laborRevenueThisMonth = roundCurrency(paidInvoices.reduce((sum, inv) => sum + Number(inv.labor_amount || 0), 0));
    const materialCostThisMonth = roundCurrency(paidInvoices.reduce((sum, inv) => sum + Number(inv.materials_amount || 0), 0));

    res.json({
      success: true,
      data: {
        activeClients: activeClientsResult.count || 0,
        revenueThisMonth,
        laborRevenueThisMonth,
        materialCostThisMonth,
        jobsThisMonth: jobsThisMonthResult.count || 0,
        invoices: allInvoicesResult.data || [],
        jobs: allJobsResult.data || []
      }
    });

  } catch (err) {
    next(err);
  }
});

export default router;
