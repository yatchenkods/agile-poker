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
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import RefreshIcon from '@mui/icons-material/Refresh';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import { api } from '../services/api';

function Admin() {
  const [stats, setStats] = useState(null);
  const [conflicts, setConflicts] = useState([]);
  const [usersStats, setUsersStats] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resetDialog, setResetDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState(null);
  const [resetError, setResetError] = useState(null);

  useEffect(() => {
    console.log('Admin component mounted, loading data...');
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    console.log('Loading admin data...');
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching stats...');
      const statsRes = await api.get('/admin/stats');
      console.log('Stats response:', statsRes.data);
      setStats(statsRes.data);

      console.log('Fetching conflicting estimates...');
      const conflictsRes = await api.get('/admin/conflicting-estimates');
      console.log('Conflicts response:', conflictsRes.data);
      setConflicts(conflictsRes.data || []);

      console.log('Fetching users stats...');
      const usersRes = await api.get('/admin/users-stats');
      console.log('Users response:', usersRes.data);
      setUsersStats(usersRes.data || []);

      // Extract users from usersStats
      if (usersRes.data && Array.isArray(usersRes.data)) {
        console.log('Processing users array, length:', usersRes.data.length);
        const userList = usersRes.data.map((stat) => {
          console.log('Processing user:', stat);
          return {
            id: stat.user_id,
            email: stat.email,
            full_name: stat.full_name,
            is_active: stat.is_active,
            is_admin: stat.is_admin || false,
            total_estimates: stat.total_estimates,
            participated_sessions: stat.participated_sessions,
          };
        });
        console.log('Final users list:', userList);
        setUsers(userList);
      } else {
        console.log('Users response is not an array or empty');
        setUsers([]);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
      console.error('Error response:', err.response);
      setError(err.response?.data?.detail || err.message || 'Failed to load admin data');
    } finally {
      setLoading(false);
      console.log('Admin data loading finished');
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

    // Validation
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
      const response = await api.post('/admin/reset-password', {
        user_id: selectedUser.id,
        new_password: newPassword,
      });

      setResetMessage(`✅ ${response.data.message}`);
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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        🛠️ Admin Dashboard
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Statistics */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Users
                </Typography>
                <Typography variant="h5">{stats.total_users}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Sessions
                </Typography>
                <Typography variant="h5">{stats.total_sessions}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Issues
                </Typography>
                <Typography variant="h5">{stats.total_issues}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Estimates
                </Typography>
                <Typography variant="h5">{stats.total_estimates}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* User Management */}
      {users && users.length > 0 ? (
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">👥 User Management ({users.length})</Typography>
            <IconButton onClick={loadAdminData} size="small" title="Refresh">
              <RefreshIcon />
            </IconButton>
          </Box>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell>Email</TableCell>
                  <TableCell>Full Name</TableCell>
                  <TableCell align="center">Role</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell align="right">Estimates</TableCell>
                  <TableCell align="center">Actions</TableCell>
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
        </Box>
      ) : (
        <Alert severity="info" sx={{ mb: 2 }}>
          No users found or still loading user data
        </Alert>
      )}

      {/* Conflicting Estimates */}
      {conflicts.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            <WarningIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Issues with Conflicting Estimates
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#ffe0e0' }}>
                  <TableCell>Jira Key</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell align="right">Min</TableCell>
                  <TableCell align="right">Max</TableCell>
                  <TableCell align="right">Variance</TableCell>
                  <TableCell align="right">Votes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {conflicts.map((conflict) => (
                  <TableRow key={conflict.issue_id}>
                    <TableCell>{conflict.jira_key}</TableCell>
                    <TableCell>{conflict.title}</TableCell>
                    <TableCell align="right">{conflict.min_points}</TableCell>
                    <TableCell align="right">{conflict.max_points}</TableCell>
                    <TableCell align="right">{conflict.variance}</TableCell>
                    <TableCell align="right">{conflict.estimates_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Password Reset Dialog */}
      <Dialog open={resetDialog} onClose={handleCloseResetDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          🔐 Reset Password for {selectedUser?.email}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
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
