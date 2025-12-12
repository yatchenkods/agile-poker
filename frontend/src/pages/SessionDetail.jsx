import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import GetAppIcon from '@mui/icons-material/GetApp';

import { api } from '../services/api';
import SessionBoard from '../components/SessionBoard';

function SessionDetail() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [isCreator, setIsCreator] = useState(false);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    project_key: '',
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Import issues dialog state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFormData, setImportFormData] = useState({
    issue_keys_text: '',
  });
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState('');
  const [importedIssues, setImportedIssues] = useState([]);
  const [importStats, setImportStats] = useState(null);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    loadSessionData();
    // Setup WebSocket connection
    setupWebSocket();
  }, [sessionId]);

  useEffect(() => {
    // Check if current user is session creator
    if (currentUser && session) {
      setIsCreator(currentUser.id === session.created_by_id);
    }
  }, [currentUser, session]);

  const loadSessionData = async () => {
    try {
      const [sessionRes, issuesRes, userRes] = await Promise.all([
        api.get(`/sessions/${sessionId}`),
        api.get(`/issues/?session_id=${sessionId}`),
        api.get('/auth/me'),
      ]);
      setSession(sessionRes.data);
      setIssues(issuesRes.data);
      setCurrentUser(userRes.data);
    } catch (err) {
      setError('Failed to load session data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const setupWebSocket = () => {
    const token = localStorage.getItem('token');
    const wsUrl = `${process.env.REACT_APP_WS_URL || 'ws://localhost:8000'}/ws/session/${sessionId}?token=${token}`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'estimate_update') {
        // Update estimates in real-time
        console.log('Estimate updated:', data.data);
        // Reload issues to get updated estimates
        loadSessionData();
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  };

  // Edit session handlers
  const handleEditOpen = () => {
    if (session) {
      setEditFormData({
        name: session.name,
        description: session.description || '',
        project_key: session.project_key || '',
      });
      setEditError('');
      setEditDialogOpen(true);
    }
  };

  const handleEditClose = () => {
    setEditDialogOpen(false);
    setEditFormData({ name: '', description: '', project_key: '' });
  };

  const handleEditSave = async () => {
    if (!editFormData.name.trim()) {
      setEditError('Session name is required');
      return;
    }

    setEditLoading(true);
    setEditError('');

    try {
      const response = await api.put(`/sessions/${sessionId}`, {
        name: editFormData.name,
        description: editFormData.description || null,
      });
      setSession(response.data);
      handleEditClose();
    } catch (err) {
      console.error('Failed to update session:', err);
      setEditError(err.response?.data?.detail || 'Failed to update session');
    } finally {
      setEditLoading(false);
    }
  };

  // Import issues handlers
  const parseIssueKeys = (text) => {
    return text
      .split(/[\s,]+/)
      .map((key) => key.trim().toUpperCase())
      .filter((key) => key && /^[A-Z]+-\d+$/.test(key));
  };

  const handleImportOpen = () => {
    setImportError('');
    setImportFormData({ issue_keys_text: '' });
    setImportedIssues([]);
    setImportStats(null);
    setImportDialogOpen(true);
  };

  const handleImportClose = () => {
    setImportDialogOpen(false);
  };

  const handleImportIssues = async () => {
    const issueKeys = parseIssueKeys(importFormData.issue_keys_text);

    if (issueKeys.length === 0) {
      setImportError('Please enter at least one valid Jira issue key (e.g., DEVOPS-123)');
      return;
    }

    setImportLoading(true);
    setImportError('');

    try {
      const response = await api.post(`/sessions/${sessionId}/import-issues`, {
        issue_keys: issueKeys,
      });

      setImportStats({
        imported: response.data.imported_count,
        failed: response.data.failed_count,
      });

      // Reload issues
      await loadSessionData();

      // Clear form and close after success
      setTimeout(() => {
        handleImportClose();
      }, 1500);
    } catch (err) {
      console.error('Failed to import issues:', err);
      setImportError(err.response?.data?.detail || 'Failed to import issues');
    } finally {
      setImportLoading(false);
    }
  };

  // Delete session handlers
  const handleDeleteOpen = () => {
    setDeleteError('');
    setDeleteDialogOpen(true);
  };

  const handleDeleteClose = () => {
    setDeleteDialogOpen(false);
  };

  const handleDeleteSession = async () => {
    setDeleteLoading(true);
    setDeleteError('');

    try {
      await api.delete(`/sessions/${sessionId}`);
      // Redirect to home page after successful deletion
      navigate('/');
    } catch (err) {
      console.error('Failed to delete session:', err);
      setDeleteError(err.response?.data?.detail || 'Failed to delete session');
      setDeleteLoading(false);
    }
  };

  // Delete issue handler
  const handleDeleteIssue = async (issueId) => {
    if (!window.confirm('Are you sure you want to remove this issue from the session?')) {
      return;
    }

    try {
      await api.delete(`/sessions/${sessionId}/issues/${issueId}`);
      // Reload session data
      await loadSessionData();
    } catch (err) {
      console.error('Failed to delete issue:', err);
      setError('Failed to remove issue from session');
    }
  };

  if (loading) {
    return <Typography>Loading session...</Typography>;
  }

  if (error && !editError && !importError && !deleteError) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box>
      {session && (
        <>
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h4" gutterBottom>
                  {session.name}
                </Typography>
                {session.description && (
                  <Typography variant="body1" color="textSecondary" gutterBottom>
                    {session.description}
                  </Typography>
                )}
                {session.project_key && (
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    📊 Project: <strong>{session.project_key}</strong>
                  </Typography>
                )}
              </Box>
              {isCreator && (
                <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
                  <Tooltip title="Edit session">
                    <IconButton
                      color="primary"
                      onClick={handleEditOpen}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete session">
                    <IconButton
                      color="error"
                      onClick={handleDeleteOpen}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}
            </Box>

            <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
              <Typography variant="body2">
                Status: <strong>{session.status}</strong>
              </Typography>
              <Typography variant="body2">
                Participants: <strong>{session.participant_count}</strong>
              </Typography>
              <Typography variant="body2">
                Issues: <strong>{session.issue_count}</strong>
              </Typography>
            </Box>
          </Box>

          {isCreator && (
            <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleImportOpen}
              >
                Add Issues
              </Button>
            </Box>
          )}

          <SessionBoard
            session={session}
            issues={issues}
            isCreator={isCreator}
            onDeleteIssue={handleDeleteIssue}
          />
        </>
      )}

      {/* Edit Session Dialog */}
      <Dialog open={editDialogOpen} onClose={handleEditClose} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Session</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {editError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {editError}
            </Alert>
          )}
          <TextField
            label="Session Name"
            fullWidth
            margin="normal"
            value={editFormData.name}
            onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
            disabled={editLoading}
            autoFocus
          />
          <TextField
            label="Description"
            fullWidth
            margin="normal"
            multiline
            rows={3}
            value={editFormData.description}
            onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
            disabled={editLoading}
          />
          <TextField
            label="Project Key (optional)"
            fullWidth
            margin="normal"
            value={editFormData.project_key}
            onChange={(e) => setEditFormData({ ...editFormData, project_key: e.target.value })}
            disabled={editLoading}
            placeholder="e.g., DEVOPS"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditClose} disabled={editLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleEditSave}
            variant="contained"
            disabled={editLoading || !editFormData.name.trim()}
            startIcon={editLoading ? <CircularProgress size={20} /> : undefined}
          >
            {editLoading ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import Issues Dialog */}
      <Dialog open={importDialogOpen} onClose={handleImportClose} maxWidth="sm" fullWidth>
        <DialogTitle>Add Issues to Session</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {importError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {importError}
            </Alert>
          )}
          {importStats && (
            <Alert severity="success" sx={{ mb: 2 }}>
              ✅ Successfully imported {importStats.imported} issue(s)
              {importStats.failed > 0 && ` ({importStats.failed} failed)`}
            </Alert>
          )}
          <TextField
            label="Issue Keys"
            fullWidth
            multiline
            rows={4}
            placeholder="Enter issue keys separated by spaces, commas, or newlines:&#10;DEVOPS-123&#10;DEVOPS-456 DEVOPS-789"
            value={importFormData.issue_keys_text}
            onChange={(e) => {
              setImportFormData({ ...importFormData, issue_keys_text: e.target.value });
              setImportError('');
            }}
            disabled={importLoading}
            margin="normal"
            helperText="Valid format: DEVOPS-123, PROJECT-456, etc."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleImportClose} disabled={importLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleImportIssues}
            variant="contained"
            disabled={importLoading || !importFormData.issue_keys_text.trim()}
            startIcon={importLoading ? <CircularProgress size={20} /> : <GetAppIcon />}
          >
            {importLoading ? 'Importing...' : 'Import'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Session Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: 'error.main', fontWeight: 'bold' }}>Delete Session?</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {deleteError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {deleteError}
            </Alert>
          )}
          <Alert severity="warning" sx={{ mb: 2 }}>
            ⚠️ This action cannot be undone. All issues and estimates will be permanently deleted.
          </Alert>
          <Typography>
            Are you sure you want to delete the session <strong>"{session?.name}"</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteClose} disabled={deleteLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteSession}
            variant="contained"
            color="error"
            disabled={deleteLoading}
            startIcon={deleteLoading ? <CircularProgress size={20} /> : <DeleteIcon />}
          >
            {deleteLoading ? 'Deleting...' : 'Delete Session'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default SessionDetail;
