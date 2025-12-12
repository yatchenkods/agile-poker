import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { api } from '../services/api';

function Home() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    project_key: '',
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const res = await api.get('/sessions/');
      setSessions(res.data);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async () => {
    if (!formData.name) {
      setError('Session name is required');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      await api.post('/sessions/', {
        name: formData.name,
        description: formData.description,
        project_key: formData.project_key || undefined,
      });

      setOpenDialog(false);
      setFormData({
        name: '',
        description: '',
        project_key: '',
      });
      loadSessions();
    } catch (err) {
      console.error('Failed to create session:', err);
      setError(err.response?.data?.detail || 'Failed to create session');
    } finally {
      setCreating(false);
    }
  };

  const handleSessionClick = (sessionId) => {
    navigate(`/session/${sessionId}`);
  };

  const handleDialogOpen = () => {
    setOpenDialog(true);
    setError(null);
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
    setFormData({
      name: '',
      description: '',
      project_key: '',
    });
    setError(null);
  };

  if (loading) {
    return <Typography>Loading sessions...</Typography>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4">🎲 Planning Poker Sessions</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleDialogOpen}
        >
          New Session
        </Button>
      </Box>

      <Grid container spacing={2}>
        {sessions.map((session) => (
          <Grid item xs={12} sm={6} md={4} key={session.id}>
            <Card
              onClick={() => handleSessionClick(session.id)}
              sx={{ cursor: 'pointer', '&:hover': { boxShadow: 4 } }}
            >
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {session.name}
                </Typography>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  {session.description}
                </Typography>
                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  <Typography variant="caption">
                    👥 {session.participant_count}
                  </Typography>
                  <Typography variant="caption">
                    📋 {session.issue_count}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={openDialog} onClose={handleDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>📝 Create New Session</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            label="Session Name"
            fullWidth
            margin="normal"
            placeholder="Sprint Planning Session"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            disabled={creating}
            autoFocus
          />
          <TextField
            label="Description"
            fullWidth
            margin="normal"
            multiline
            rows={3}
            placeholder="Session description..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            disabled={creating}
          />
          <TextField
            label="Jira Project Key (optional)"
            fullWidth
            margin="normal"
            placeholder="e.g., PROJ"
            value={formData.project_key}
            onChange={(e) => setFormData({ ...formData, project_key: e.target.value })}
            disabled={creating}
            helperText="Project key from Jira (e.g., PROJ, ABC)"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} disabled={creating}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateSession}
            variant="contained"
            disabled={creating || !formData.name}
            startIcon={creating ? <CircularProgress size={20} /> : <AddIcon />}
          >
            {creating ? 'Creating...' : 'Create Session'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Home;
