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
  IconButton,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import GetAppIcon from '@mui/icons-material/GetApp';
import HelpIcon from '@mui/icons-material/Help';
import ErrorIcon from '@mui/icons-material/Error';
import RefreshIcon from '@mui/icons-material/Refresh';

import { api } from '../services/api';

function Home() {
  const navigate = useNavigate();
  const [allSessions, setAllSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
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
  const [failedIssues, setFailedIssues] = useState([]);

  useEffect(() => {
    // Load current user and sessions
    Promise.all([loadSessions(), loadCurrentUser()]);

    // Set up window focus listener for auto-refresh
    window.addEventListener('focus', handleWindowFocus);
    return () => {
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, []);

  const handleWindowFocus = () => {
    // Refresh sessions when user returns to the window
    loadSessions(true);
  };

  const loadCurrentUser = async () => {
    try {
      const res = await api.get('/auth/me');
      setCurrentUser(res.data);
    } catch (err) {
      console.error('Failed to load current user:', err);
    }
  };

  const loadSessions = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      const res = await api.get('/sessions/');
      setAllSessions(res.data);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  // Filter sessions based on user role
  const getVisibleSessions = () => {
    // Admins see all sessions
    if (currentUser?.is_admin) {
      return allSessions;
    }

    // Regular users see only sessions where they are in the estimators list
    return allSessions.filter((session) => {
      return session.estimators?.some((estimator) => estimator.id === currentUser?.id);
    });
  };

  const sessions = getVisibleSessions();

  // Parse issue keys from text input (handles spaces, commas, newlines)
  const parseIssueKeys = (text) => {
    return text
      .split(/[\s,]+/) // Split by whitespace or commas
      .map((key) => key.trim().toUpperCase())
      .filter((key) => key && /^[A-Z]+-\d+$/.test(key)); // Filter valid keys (e.g., DEVOPS-123)
  };

  // Group failed issues by error reason for better display
  const groupFailedByReason = (failed) => {
    const grouped = {};
    failed.forEach((item) => {
      if (!grouped[item.reason]) {
        grouped[item.reason] = [];
      }
      grouped[item.reason].push(item);
    });
    return grouped;
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
    setFailedIssues([]);

    try {
      const response = await api.post('/jira/import-by-keys', {
        issue_keys: issueKeys,
      });

      setImportedIssues(response.data.issues || []);
      setFailedIssues(response.data.failed_issues || []);
      setImportStats({
        total: response.data.count || 0,
        status: response.data.status,
        failed: response.data.failed_count || 0,
      });

      if (response.data.issues?.length === 0 && response.data.failed_count > 0) {
        setError(
          `Failed to import ${response.data.failed_count} issue(s). See details below.`
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
      setFailedIssues([]);
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
    setFailedIssues([]);
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
    setFailedIssues([]);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const isAdmin = currentUser?.is_admin;

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
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Tooltip title="Refresh sessions">
            <IconButton
              onClick={() => loadSessions(true)}
              disabled={refreshing}
              size="small"
            >
              {refreshing ? (
                <CircularProgress size={24} />
              ) : (
                <RefreshIcon />
              )}
            </IconButton>
          </Tooltip>
          {isAdmin && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleDialogOpen}>
              New Session
            </Button>
          )}
        </Box>
      </Box>

      {!isAdmin && sessions.length === 0 && allSessions.length > 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Box>
            <Typography variant="body2" sx={{ mb: 1 }}>
              ℹ️ You are not listed as an estimator in any sessions.
            </Typography>
            <Typography variant="caption" color="inherit">
              Please contact an administrator to add you to a session. Try refreshing the page if you were recently added.
            </Typography>
          </Box>
        </Alert>
      )}

      {sessions.length === 0 && (
        <Typography variant="body1" color="textSecondary" sx={{ textAlign: 'center', py: 4 }}>
          {isAdmin ? 'No sessions available. Create one to get started!' : 'No sessions to display.'}
        </Typography>
      )}

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

            {failedIssues.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Alert severity="warning" icon={<ErrorIcon />}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    Failed to import {failedIssues.length} issue(s)
                  </Typography>
                </Alert>
                
                {Object.entries(groupFailedByReason(failedIssues)).map(([reason, issues]) => (
                  <Box key={reason} sx={{ mt: 1.5, p: 1.5, bgcolor: '#fff3e0', borderRadius: 1, border: '1px solid #ffe0b2' }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1, color: '#e65100' }}>
                      {reason}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {issues.map((item) => (
                        <Box key={item.key} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Box
                            sx={{
                              bgcolor: '#ffccbc',
                              p: 0.5,
                              px: 1,
                              borderRadius: 1,
                              fontSize: '0.75rem',
                              fontWeight: 'bold',
                              color: '#d84315',
                            }}
                          >
                            {item.key}
                          </Box>
                          {item.details && (
                            <Typography variant="caption" sx={{ color: '#d84315', fontSize: '0.65rem' }}>
                              ({item.details})
                            </Typography>
                          )}
                        </Box>
                      ))}
                    </Box>
                  </Box>
                ))}
              </Box>
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
                        border: '1px solid #81c784',
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