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
import HelpIcon from '@mui/icons-material/Help';
import { api } from '../services/api';

function Home() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    import_from_jira: false,
    issue_keys_text: '',
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importedIssues, setImportedIssues] = useState([]);
  const [importStats, setImportStats] = useState(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionTest, setConnectionTest] = useState(null);
  const [failedKeys, setFailedKeys] = useState([]);

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

  // Parse issue keys from text input (handles spaces, commas, newlines)
  const parseIssueKeys = (text) => {
    return text
      .split(/[\s,]+/) // Split by whitespace or commas
      .map((key) => key.trim().toUpperCase())
      .filter((key) => key && /^[A-Z]+-\d+$/.test(key)); // Filter valid keys (e.g., DEVOPS-123)
  };

  const handleTestJiraConnection = async () => {
    setTestingConnection(true);
    setConnectionTest(null);
    setError(null);

    try {
      const response = await api.get('/jira/test-connection');
      setConnectionTest(response.data);
    } catch (err) {
      console.error('Failed to test Jira connection:', err);
      setError('Failed to test Jira connection');
    } finally {
      setTestingConnection(false);
    }
  };

  const handleImportFromJira = async () => {
    const issueKeys = parseIssueKeys(formData.issue_keys_text);

    if (issueKeys.length === 0) {
      setError('Please enter at least one valid Jira issue key (e.g., DEVOPS-123)');
      return;
    }

    setImportLoading(true);
    setError(null);
    setFailedKeys([]);

    try {
      const response = await api.post('/jira/import-by-keys', {
        issue_keys: issueKeys,
      });

      setImportedIssues(response.data.issues || []);
      setFailedKeys(response.data.failed_keys || []);
      setImportStats({
        total: response.data.count || 0,
        status: response.data.status,
        failed: response.data.failed_count || 0,
      });

      if (response.data.issues?.length === 0 && response.data.failed_count > 0) {
        setError(
          `Failed to import ${response.data.failed_count} issue(s). Check the keys and try again.`
        );
      }
    } catch (err) {
      console.error('Failed to import from Jira:', err);
      setError(
        err.response?.data?.detail ||
        'Failed to import issues from Jira. Please check your connection and issue keys.'
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
        import_issues: importedIssues.map((issue) => issue.key),
      });

      setOpenDialog(false);
      setFormData({
        name: '',
        description: '',
        import_from_jira: false,
        issue_keys_text: '',
      });
      setImportedIssues([]);
      setImportStats(null);
      setConnectionTest(null);
      setFailedKeys([]);
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
    setConnectionTest(null);
    setFailedKeys([]);
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
    setFormData({
      name: '',
      description: '',
      import_from_jira: false,
      issue_keys_text: '',
    });
    setImportedIssues([]);
    setImportStats(null);
    setError(null);
    setConnectionTest(null);
    setFailedKeys([]);
  };

  if (loading) {
    return <Typography>Loading sessions...</Typography>;
  }

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 4,
        }}
      >
        <Typography variant="h4">🎲 Planning Poker Sessions</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleDialogOpen}>
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
                  <Typography variant="caption">👥 {session.participant_count}</Typography>
                  <Typography variant="caption">📋 {session.issue_count}</Typography>
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
              disabled={importLoading || creating}
              autoFocus
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
              disabled={importLoading || creating}
            />
          </Box>

          <Divider sx={{ mb: 3 }} />

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
              📋 Import Issues from Jira (Optional)
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
              label="Import issues by keys"
            />

            {formData.import_from_jira && (
              <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                <TextField
                  label="Issue Keys"
                  fullWidth
                  multiline
                  rows={4}
                  placeholder="Enter issue keys separated by spaces, commas, or newlines:&#10;DEVOPS-123&#10;DEVOPS-456 DEVOPS-789&#10;or: DEVOPS-123, DEVOPS-456, DEVOPS-789"
                  value={formData.issue_keys_text}
                  onChange={(e) => {
                    setFormData({ ...formData, issue_keys_text: e.target.value });
                    setError(null);
                  }}
                  disabled={importLoading}
                  margin="normal"
                  helperText="Valid format: DEVOPS-123, PROJECT-456, etc."
                />

                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={importLoading ? <CircularProgress size={20} /> : <GetAppIcon />}
                    onClick={handleImportFromJira}
                    disabled={importLoading || !formData.issue_keys_text.trim()}
                  >
                    {importLoading ? 'Importing...' : 'Import Issues'}
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={testingConnection ? <CircularProgress size={20} /> : <HelpIcon />}
                    onClick={handleTestJiraConnection}
                    disabled={testingConnection}
                    sx={{ minWidth: 120 }}
                  >
                    {testingConnection ? 'Testing...' : 'Test'}
                  </Button>
                </Box>
              </Box>
            )}

            {connectionTest && (
              <Alert
                severity={connectionTest.connected ? 'success' : 'warning'}
                sx={{ mt: 2 }}
              >
                <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                  {connectionTest.message}
                </Typography>
                {connectionTest.details?.possible_issues && (
                  <Box sx={{ ml: 2, mt: 1 }}>
                    <Typography variant="caption" display="block">
                      Possible issues:
                    </Typography>
                    {connectionTest.details.possible_issues.map((issue, idx) => (
                      <Typography key={idx} variant="caption" display="block" sx={{ ml: 1 }}>
                        - {issue}
                      </Typography>
                    ))}
                  </Box>
                )}
              </Alert>
            )}

            {importStats && (
              <Alert
                severity={importStats.failed === 0 ? 'success' : 'info'}
                sx={{ mt: 2 }}
              >
                ✅ Successfully imported {importStats.total} issue
                {importStats.total !== 1 ? 's' : ''}
                {importStats.failed > 0 && ` (${importStats.failed} failed)`}
              </Alert>
            )}

            {failedKeys.length > 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Failed to import {failedKeys.length} issue(s):
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {failedKeys.map((key) => (
                    <Box
                      key={key}
                      sx={{
                        bgcolor: '#ffebee',
                        p: 0.5,
                        px: 1,
                        borderRadius: 1,
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                      }}
                    >
                      {key}
                    </Box>
                  ))}
                </Box>
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
                      {issue.key}: {issue.title}
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
