import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Paper, Dialog, 
  DialogTitle, DialogContent, DialogActions, TextField,
  CircularProgress, Select, MenuItem, FormControl, InputLabel,
  Switch, FormControlLabel
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';

export const JobList = () => {
  const { session } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Job modal state
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ client_id: '', title: '', rate_type: 'flat', hourly_rate: 0 });

  // Material modal state
  const [matOpen, setMatOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [matData, setMatData] = useState({ description: '', cost: 0, is_from_stock: false });

  useEffect(() => {
    fetchJobs();
    fetchClients();
  }, []);

  const fetchJobs = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/jobs', {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      const data = await res.json();
      if (data.success) setJobs(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/clients', {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      const data = await res.json();
      if (data.success) setClients(data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateJob = async () => {
    try {
      const payload = {
        ...formData,
        hourly_rate: formData.rate_type === 'hourly' ? parseFloat(formData.hourly_rate) : undefined
      };
      const res = await fetch('http://localhost:4000/api/jobs', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        fetchJobs();
        setOpen(false);
        setFormData({ client_id: '', title: '', rate_type: 'flat', hourly_rate: 0 });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMaterial = async () => {
    try {
      const payload = { ...matData, cost: parseFloat(matData.cost) };
      const res = await fetch(`http://localhost:4000/api/jobs/${selectedJobId}/materials`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setMatOpen(false);
        setMatData({ description: '', cost: 0, is_from_stock: false });
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" mb={2}>
        <Typography variant="h5">Jobs</Typography>
        <Button variant="contained" onClick={() => setOpen(true)}>Add Job</Button>
      </Box>

      {loading ? <CircularProgress /> : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Client</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Rate Type</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {jobs.map(j => (
                <TableRow key={j.id}>
                  <TableCell>{j.title}</TableCell>
                  <TableCell>{j.clients?.name}</TableCell>
                  <TableCell>{j.status}</TableCell>
                  <TableCell>{j.rate_type}</TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => { setSelectedJobId(j.id); setMatOpen(true); }}>Add Material</Button>
                  </TableCell>
                </TableRow>
              ))}
              {jobs.length === 0 && (
                <TableRow><TableCell colSpan={5} align="center">No jobs found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* New Job Modal */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Job</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="dense">
            <InputLabel>Client</InputLabel>
            <Select value={formData.client_id} label="Client" onChange={e => setFormData({...formData, client_id: e.target.value})}>
              {clients.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField margin="dense" label="Job Title" fullWidth value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
          <FormControl fullWidth margin="dense">
            <InputLabel>Rate Type</InputLabel>
            <Select value={formData.rate_type} label="Rate Type" onChange={e => setFormData({...formData, rate_type: e.target.value})}>
              <MenuItem value="flat">Flat Rate</MenuItem>
              <MenuItem value="hourly">Hourly Rate</MenuItem>
            </Select>
          </FormControl>
          {formData.rate_type === 'hourly' && (
            <TextField margin="dense" label="Hourly Rate ($)" type="number" fullWidth value={formData.hourly_rate} onChange={e => setFormData({...formData, hourly_rate: e.target.value})} />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateJob} disabled={!formData.client_id || !formData.title}>Save Job</Button>
        </DialogActions>
      </Dialog>

      {/* Add Material Modal */}
      <Dialog open={matOpen} onClose={() => setMatOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Material to Job</DialogTitle>
        <DialogContent>
          <TextField margin="dense" label="Description" fullWidth value={matData.description} onChange={e => setMatData({...matData, description: e.target.value})} />
          <TextField margin="dense" label="Cost ($)" type="number" fullWidth value={matData.cost} onChange={e => setMatData({...matData, cost: e.target.value})} />
          <FormControlLabel 
            control={<Switch checked={matData.is_from_stock} onChange={e => setMatData({...matData, is_from_stock: e.target.checked})} />} 
            label="Pulled From Stock Inventory?" 
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMatOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddMaterial} disabled={!matData.description || matData.cost < 0}>Add Material</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
