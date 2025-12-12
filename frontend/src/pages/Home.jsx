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
  FormControlLabel,
  Checkbox,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import GetAppIcon from '@mui/icons-material/GetApp';
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
    sprint_name: '',
    import_from_jira: false,
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importedIssues, setImportedIssues] = useState([]);
  const [importStats, setImportStats] = useState(null);

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

  const handleImportFromJira = async () => {
    if (!formData.project_key) {
      setError('Please enter Jira Project Key');
      return;
    }

    if (!formData.sprint_name) {
      setError('Please enter Sprint Name');
      return;
    }

    setImportLoading(true);
    setError(null);

    try {
      const response = await api.post('/jira/import-sprint', {
        project_key: formData.project_key.toUpperCase(),
        sprint_name: formData.sprint_name,
      });

      setImportedIssues(response.data.issues || []);
      setImportStats({
        total: response.data.issues?.length || 0,
        status: response.data.status,
      });

      if (response.data.issues?.length === 0) {
        setError('No issues found in the specified sprint');
      }
    } catch (err) {
      console.error('Failed to import from Jira:', err);
      setError(
        err.response?.data?.detail ||
        'Failed to import issues from Jira. Please check Project Key and Sprint Name.'
      );
    } finally {
      setImportLoading(false);
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
      const response = await api.post('/sessions/', {
        name: formData.name,
        description: formData.description,
        project_key: formData.project_key || undefined,
        import_issues: importedIssues.map(issue => issue.key),
      });

      setOpenDialog(false);
      setFormData({
        name: '',
        description: '',
        project_key: '',
        sprint_name: '',
        import_from_jira: false,
      });
      setImportedIssues([]);
      setImportStats(null);
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
    setImportedIssues([]);
    setImportStats(null);
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
    setFormData({
      name: '',
      description: '',
      project_key: '',
      sprint_name: '',
      import_from_jira: false,
    });
    setImportedIssues([]);
    setImportStats(null);
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

          {/* Basic Info Section */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
              Session Details
            </Typography>
            <TextField
              label="Session Name"
              fullWidth
              margin="normal"
              placeholder="Sprint Review Planning"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={importing || creatingLOADING}
            />
            <TextField
              label="Description"
              fullWidth
              margin="normal"
              multiline
              rows={2}
              placeholder="Session description..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={importing || creatingLOADING}
            />
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Jira Import Section */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
              📌 Import from Jira (Optional)
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.import_from_jira}
                  onChange={(e) => {
                    setFormData({ ...formData, import_from_jira: e.target.checked });
                    setError(null);
                  }}
                  disabled={importLoading || creating}
                />
              }
              label="Import issues from Jira sprint"
            />

            {formData.import_from_jira && (
              <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                <TextField
                  label="Jira Project Key"
                  fullWidth
                  margin="normal"
                  placeholder="e.g., PROJ"
                  value={formData.project_key}
                  onChange={(e) => setFormData({ ...formData, project_key: e.target.value })}
                  disabled={importLoading}
                  helperText="Example: PROJ, ABC, etc."
                />
                <TextField
                  label="Sprint Name"
                  fullWidth
                  margin="normal"
                  placeholder="e.g., Sprint 1, Q1 2025"
                  value={formData.sprint_name}
                  onChange={(e) => setFormData({ ...formData, sprint_name: e.target.value })}
                  disabled={importLoading}
                  helperText="The exact sprint name from Jira"
                />

                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={importLoading ? <CircularProgress size={20} /> : <GetAppIcon />}
                  onClick={handleImportFromJira}
                  disabled={importLoading}
                  sx={{ mt: 2 }}
                >
                  {importLoading ? 'Importing...' : 'Import Issues'}
                </Button>
              </Box>
            )}

            {/* Import Results */}
            {importStats && (
              <Alert severity="success" sx={{ mt: 2 }}>
                ✅ Successfully imported {importStats.total} issue{importStats.total !== 1 ? 's' : ''}
              </Alert>
            )}

            {importedIssues.length > 0 && (
              <Box sx={{ mt: 2, maxHeight: 200, overflow: 'auto' }}>
                <Typography variant="caption" color="textSecondary">
                  Issues to import ({importedIssues.length}):
                </Typography>
                <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {importedIssues.slice(0, 10).map((issue) => (
                    <Box
                      key={issue.key}
                      sx={{
                        bgcolor: '#e8f5e9',
                        p: 0.5,
                        px: 1,
                        borderRadius: 1,
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                      }}
                    >
                      {issue.key}
                    </Box>
                  ))}
                  {importedIssues.length > 10 && (
                    <Box
                      sx={{
                        bgcolor: '#f5f5f5',
                        p: 0.5,
                        px: 1,
                        borderRadius: 1,
                        fontSize: '0.75rem',
                      }}
                    >
                      +{importedIssues.length - 10} more
                    </Box>
                  )}
                </Box>
              </Box>
            )}
          </Box>
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
