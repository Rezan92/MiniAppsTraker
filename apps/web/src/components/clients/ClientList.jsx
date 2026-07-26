import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Paper, Dialog, 
  DialogTitle, DialogContent, DialogActions, TextField,
  CircularProgress
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';

export const ClientList = () => {
  const { session } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', address: '', notes: '' });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/clients', {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      const data = await res.json();
      if (data.success) {
        setClients(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/clients', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        fetchClients();
        setOpen(false);
        setFormData({ name: '', email: '', phone: '', address: '', notes: '' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" mb={2}>
        <Typography variant="h5">Clients</Typography>
        <Button variant="contained" onClick={() => setOpen(true)}>Add Client</Button>
      </Box>

      {loading ? <CircularProgress /> : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {clients.map(c => (
                <TableRow key={c.id}>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c.email}</TableCell>
                  <TableCell>{c.phone}</TableCell>
                </TableRow>
              ))}
              {clients.length === 0 && (
                <TableRow><TableCell colSpan={3} align="center">No clients found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Client</DialogTitle>
        <DialogContent>
          <TextField margin="dense" label="Name" fullWidth value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          <TextField margin="dense" label="Email" fullWidth value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
          <TextField margin="dense" label="Phone" fullWidth value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
          <TextField margin="dense" label="Address" fullWidth value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
          <TextField margin="dense" label="Notes" fullWidth multiline rows={3} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={!formData.name}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
