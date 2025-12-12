import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Chip,
  IconButton,
  Tabs,
  Tab,
  FormControlLabel,
  Switch,
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import RefreshIcon from '@mui/icons-material/Refresh';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import BarChartIcon from '@mui/icons-material/BarChart';
import PeopleIcon from '@mui/icons-material/People';
import AssignmentIcon from '@mui/icons-material/Assignment';
import LockIcon from '@mui/icons-material/Lock';
import { api } from '../services/api';

function Admin() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState(0); // 0=Statistics, 1=Users, 2=Issues
  const [stats, setStats] = useState(null);
  const [issues, setIssues] = useState([]);
  const [users, setUsers] = useState([]);
  const [estimationStats, setEstimationStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showOnlyPending, setShowOnlyPending] = useState(false);
  
  // Reset password dialog
  const [resetDialog, setResetDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState(null);
  const [resetError, setResetError] = useState(null);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const userRes = await api.get('/auth/me');
      setCurrentUser(userRes.data);
      setIsAdmin(userRes.data.is_admin);
      
      if (!userRes.data.is_admin) {
        setError('Access denied. Admin rights required.');
        setLoading(false);
        return;
      }
      
      // If admin, load data
      await loadAdminData();
    } catch (err) {
      console.error('Failed to check admin access:', err);
      setError('Failed to verify admin access');
      setLoading(false);
    }
  };

  const loadAdminData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load statistics
      const statsRes = await api.get('/admin/stats');
      setStats(statsRes.data);

      // Load users
      const usersRes = await api.get('/admin/users-stats');
      if (usersRes.data && Array.isArray(usersRes.data)) {
        const userList = usersRes.data.map((stat) => ({
          id: stat.user_id,
          email: stat.email,
          full_name: stat.full_name,
          is_active: stat.is_active,
          is_admin: stat.is_admin || false,
          total_estimates: stat.total_estimates,
          participated_sessions: stat.participated_sessions,
        }));
        setUsers(userList);
      }

      // Load issues with estimation stats
      const issuesRes = await api.get('/issues/');
      if (issuesRes.data && Array.isArray(issuesRes.data)) {
        setIssues(issuesRes.data);
      }

      // Load estimation statistics (issues with vote status)
      const estimationRes = await api.get('/admin/conflicting-estimates');
      setEstimationStats(estimationRes.data || []);
    } catch (err) {
      console.error('Failed to load admin data:', err);
      setError(err.response?.data?.detail || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenResetDialog = (user) => {
    setSelectedUser(user);
    setNewPassword('');
    setConfirmPassword('');
    setResetMessage(null);
    setResetError(null);
    setResetDialog(true);
  };

  const handleCloseResetDialog = () => {
    setResetDialog(false);
    setSelectedUser(null);
  };

  const handleResetPassword = async () => {
    setResetError(null);
    setResetMessage(null);

    if (!newPassword) {
      setResetError('Password is required');
      return;
    }

    if (newPassword.length < 8) {
      setResetError('Password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match');
      return;
    }

    setResetLoading(true);

    try {
      await api.post('/admin/reset-password', {
        user_id: selectedUser.id,
        new_password: newPassword,
      });

      setResetMessage(`✅ Password reset successfully for ${selectedUser.email}`);
      setTimeout(() => {
        handleCloseResetDialog();
        loadAdminData();
      }, 2000);
    } catch (err) {
      console.error('Failed to reset password:', err);
      setResetError(err.response?.data?.detail || 'Failed to reset password');
    } finally {
      setResetLoading(false);
    }
  };

  // Filter issues based on toggle
  const filteredIssues = showOnlyPending 
    ? issues.filter(issue => !issue.is_estimated)
    : issues;

  // If not admin, show access denied
  if (!isAdmin && !loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <Card sx={{ maxWidth: 400, textAlign: 'center' }}>
          <CardContent>
            <LockIcon sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Access Denied
            </Typography>
            <Typography color="textSecondary" paragraph>
              This section is only available to administrators.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">🛠️ Admin Panel</Typography>
        <IconButton onClick={loadAdminData} title="Refresh">
          <RefreshIcon />
        </IconButton>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Tab Navigation */}
      <Paper sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab icon={<BarChartIcon />} iconPosition="start" label="Statistics" />
          <Tab icon={<PeopleIcon />} iconPosition="start" label="Users" />
          <Tab icon={<AssignmentIcon />} iconPosition="start" label="Issues" />
        </Tabs>
      </Paper>

      {/* TAB 0: STATISTICS */}
      {activeTab === 0 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>
            📊 System Overview
          </Typography>

          {/* Stats Cards */}
          {stats && (
            <Grid container spacing={2} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Total Users
                    </Typography>
                    <Typography variant="h5">{stats.total_users}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Active Sessions
                    </Typography>
                    <Typography variant="h5">{stats.total_sessions}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Total Issues
                    </Typography>
                    <Typography variant="h5">{stats.total_issues}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Total Estimates
                    </Typography>
                    <Typography variant="h5">{stats.total_estimates}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* Estimation Statistics */}
          <Typography variant="h6" sx={{ mb: 2, mt: 3 }}>
            ⚠️ Issues with Conflicting Estimates
          </Typography>

          {estimationStats.length > 0 ? (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#fff3e0' }}>
                    <TableCell><strong>Issue</strong></TableCell>
                    <TableCell><strong>Title</strong></TableCell>
                    <TableCell align="center"><strong>Estimates</strong></TableCell>
                    <TableCell align="center"><strong>Range</strong></TableCell>
                    <TableCell align="center"><strong>Variance</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {estimationStats.map((stat) => (
                    <TableRow key={stat.issue_id}>
                      <TableCell sx={{ fontWeight: 'bold' }}>{stat.jira_key}</TableCell>
                      <TableCell>{stat.title}</TableCell>
                      <TableCell align="center">
                        <Chip label={stat.estimates_count} size="small" />
                      </TableCell>
                      <TableCell align="center">{stat.min_points} - {stat.max_points}</TableCell>
                      <TableCell align="center">
                        <Chip 
                          label={stat.variance} 
                          color={stat.variance > 4 ? 'error' : 'warning'}
                          size="small" 
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Alert severity="success">✅ All estimates have reached consensus!</Alert>
          )}
        </Box>
      )}

      {/* TAB 1: USERS MANAGEMENT */}
      {activeTab === 1 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>
            👥 User Management
          </Typography>

          {users.length > 0 ? (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell><strong>Email</strong></TableCell>
                    <TableCell><strong>Full Name</strong></TableCell>
                    <TableCell align="center"><strong>Role</strong></TableCell>
                    <TableCell align="center"><strong>Status</strong></TableCell>
                    <TableCell align="right"><strong>Estimates</strong></TableCell>
                    <TableCell align="right"><strong>Sessions</strong></TableCell>
                    <TableCell align="center"><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.full_name}</TableCell>
                      <TableCell align="center">
                        {user.is_admin ? (
                          <Chip label="Admin" color="primary" size="small" />
                        ) : (
                          <Chip label="User" variant="outlined" size="small" />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {user.is_active ? (
                          <Chip label="Active" color="success" size="small" />
                        ) : (
                          <Chip label="Inactive" variant="outlined" size="small" />
                        )}
                      </TableCell>
                      <TableCell align="right">{user.total_estimates}</TableCell>
                      <TableCell align="right">{user.participated_sessions}</TableCell>
                      <TableCell align="center">
                        <Button
                          startIcon={<VpnKeyIcon />}
                          size="small"
                          variant="outlined"
                          onClick={() => handleOpenResetDialog(user)}
                        >
                          Reset Password
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Alert severity="info">No users found</Alert>
          )}
        </Box>
      )}

      {/* TAB 2: ISSUES MANAGEMENT */}
      {activeTab === 2 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">📋 Issue Management</Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={showOnlyPending}
                  onChange={(e) => setShowOnlyPending(e.target.checked)}
                  color="primary"
                />
              }
              label="Show only pending (not estimated)"
            />
          </Box>

          {filteredIssues.length > 0 ? (
            <Box>
              <Typography variant="caption" color="textSecondary" sx={{ mb: 1, display: 'block' }}>
                Showing {filteredIssues.length} of {issues.length} issues
                {showOnlyPending && ` (pending: ${issues.filter(i => !i.is_estimated).length})`}
              </Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                      <TableCell><strong>Issue Key</strong></TableCell>
                      <TableCell><strong>Title</strong></TableCell>
                      <TableCell><strong>Session</strong></TableCell>
                      <TableCell align="center"><strong>Current Estimate</strong></TableCell>
                      <TableCell align="center"><strong>Status</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredIssues.map((issue) => (
                      <TableRow 
                        key={issue.id}
                        sx={{
                          backgroundColor: !issue.is_estimated ? '#fff9c4' : 'inherit',
                          '&:hover': {
                            backgroundColor: !issue.is_estimated ? '#ffeb3b' : '#f5f5f5'
                          }
                        }}
                      >
                        <TableCell sx={{ fontWeight: 'bold' }}>{issue.jira_key}</TableCell>
                        <TableCell>{issue.title}</TableCell>
                        <TableCell>{issue.session_name || 'N/A'}</TableCell>
                        <TableCell align="center">
                          {issue.story_points ? (
                            <Chip label={`${issue.story_points} pts`} color="success" />
                          ) : (
                            <Chip label="Not set" variant="outlined" />
                          )}
                        </TableCell>
                        <TableCell align="center">
                          {issue.is_estimated ? (
                            <Chip label="Estimated" color="success" size="small" />
                          ) : (
                            <Chip label="Pending" color="warning" size="small" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ) : (
            <Alert severity="info">
              {showOnlyPending 
                ? 'All issues have been estimated! 🎉' 
                : 'No issues found'
              }
            </Alert>
          )}
        </Box>
      )}

      {/* Password Reset Dialog */}
      <Dialog open={resetDialog} onClose={handleCloseResetDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          🔐 Reset Password
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Resetting password for: <strong>{selectedUser?.email}</strong>
          </Typography>

          {resetMessage && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {resetMessage}
            </Alert>
          )}
          {resetError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {resetError}
            </Alert>
          )}

          <TextField
            fullWidth
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={resetLoading}
            margin="normal"
            placeholder="Minimum 8 characters"
          />
          <TextField
            fullWidth
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={resetLoading}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseResetDialog} disabled={resetLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleResetPassword}
            variant="contained"
            disabled={resetLoading}
            startIcon={resetLoading ? <CircularProgress size={20} /> : <VpnKeyIcon />}
          >
            {resetLoading ? 'Resetting...' : 'Reset Password'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Admin;
