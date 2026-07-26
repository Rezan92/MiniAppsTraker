import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { supabase } from './config/supabase.js';

const app = express();
const port = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// Start Server and verify DB connectivity
app.listen(port, async () => {
  console.log(`API server is running on port ${port}`);

  try {
    const { error } = await supabase.from('tenants').select('id').limit(1);
    if (error) {
      console.warn('Startup DB Connection Check: Unable to connect or query tenants table.', error.message);
    } else {
      console.log('Successfully connected to Supabase Database.');
    }
  } catch (err) {
    console.error('Startup DB Connection Check Failed:', err.message);
  }
});
