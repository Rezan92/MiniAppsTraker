import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/summary', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const now = new Date();
    
    // Dates for monthly revenue
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
    
    // Dates for upcoming jobs
    const today = now.toISOString().split('T')[0];
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // 1. Active Clients Count
    const { count: activeClients, error: err1 } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'active');
    if (err1) throw err1;

    // 2. Open Jobs Count
    const { count: openJobs, error: err2 } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('status', ['open', 'in_progress']);
    if (err2) throw err2;

    // 3. Monthly Revenue (Completed Jobs this month)
    const { data: completedJobs, error: err3 } = await supabase
      .from('jobs')
      .select('id, rate_type, flat_rate, hourly_rate, job_hours(hours)')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .gte('end_date', startOfMonth)
      .lt('end_date', nextMonth);
    if (err3) throw err3;

    let monthlyRevenue = 0;
    completedJobs.forEach(job => {
      if (job.rate_type === 'flat') {
        monthlyRevenue += Number(job.flat_rate || 0);
      } else if (job.rate_type === 'hourly') {
        const totalHours = (job.job_hours || []).reduce((sum, h) => sum + Number(h.hours), 0);
        monthlyRevenue += Number(job.hourly_rate || 0) * totalHours;
      }
    });

    // 4. Monthly Material Costs
    // We get materials for the jobs that were completed this month
    const completedJobIds = completedJobs.map(j => j.id);
    let monthlyMaterialCosts = 0;
    if (completedJobIds.length > 0) {
      const { data: materials, error: err4 } = await supabase
        .from('job_materials')
        .select('cost')
        .in('job_id', completedJobIds);
      if (err4) throw err4;
      monthlyMaterialCosts = materials.reduce((sum, m) => sum + Number(m.cost || 0), 0);
    }

    // 5. Active Jobs (Recent 10)
    const { data: activeJobsList, error: err5 } = await supabase
      .from('jobs')
      .select('id, title, status, start_date, clients(name)')
      .eq('tenant_id', tenantId)
      .in('status', ['open', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(10);
    if (err5) throw err5;

    // 6. Upcoming Jobs (Next 7 days)
    const { data: upcomingJobsList, error: err6 } = await supabase
      .from('jobs')
      .select('id, title, status, start_date, clients(name)')
      .eq('tenant_id', tenantId)
      .gte('start_date', today)
      .lte('start_date', nextWeek)
      .order('start_date', { ascending: true });
    if (err6) throw err6;

    // 7. Recent Activity Feed
    const { data: clientsData } = await supabase
      .from('clients')
      .select('id, name, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(10);
    
    const { data: jobsData } = await supabase
      .from('jobs')
      .select('id, title, created_at, clients(name)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(10);
      
    const { data: materialsData } = await supabase
      .from('job_materials')
      .select('id, description, created_at, jobs!inner(tenant_id, title)')
      .eq('jobs.tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(10);

    let activity = [];
    
    (clientsData || []).forEach(c => {
      activity.push({
        id: `client-${c.id}`,
        type: 'New Client Added',
        description: `Added client: ${c.name}`,
        created_at: c.created_at
      });
    });

    (jobsData || []).forEach(j => {
      activity.push({
        id: `job-${j.id}`,
        type: 'Job Created',
        description: `Created job: ${j.title} for ${j.clients?.name || 'Unknown Client'}`,
        created_at: j.created_at
      });
    });

    (materialsData || []).forEach(m => {
      activity.push({
        id: `mat-${m.id}`,
        type: 'Material Logged',
        description: `Logged material: ${m.description} on job ${m.jobs?.title || 'Unknown Job'}`,
        created_at: m.created_at
      });
    });

    // Sort all activity descending by created_at and take top 10
    activity.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const recentActivity = activity.slice(0, 10);

    res.json({
      success: true,
      data: {
        activeClients: activeClients || 0,
        openJobs: openJobs || 0,
        monthlyRevenue,
        monthlyMaterialCosts,
        activeJobs: activeJobsList || [],
        upcomingJobs: upcomingJobsList || [],
        recentActivity
      }
    });

  } catch (err) {
    next(err);
  }
});

export default router;
