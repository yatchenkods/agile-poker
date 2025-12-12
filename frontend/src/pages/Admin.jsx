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
  Tooltip,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import BarChartIcon from '@mui/icons-material/BarChart';
import PeopleIcon from '@mui/icons-material/People';
import AssignmentIcon from '@mui/icons-material/Assignment';
import LockIcon from '@mui/icons-material/Lock';
import { api } from '../services/api';

function Admin() {
  // Auth & UI State
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [permissionError, setPermissionError] = useState(null);

  // Data State
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [issues, setIssues] = useState([]);
  const [estimationStats, setEstimationStats] = useState([]);
  const [showOnlyPending, setShowOnlyPending] = useState(false);

  // Reset Password Dialog State
  const [resetDialog, setResetDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState(null);
  const [resetError, setResetError] = useState(null);

  // Add User Dialog State
  const [addUserDialog, setAddUserDialog] = useState(false);
  const [newUserData, setNewUserData] = useState({
    email: '',
    full_name: '',
    password: '',
  });
  const [addUserLoading, setAddUserLoading] = useState(false);
  const [addUserError, setAddUserError] = useState(null);
  const [addUserMessage, setAddUserMessage] = useState(null);

  // Delete User Dialog State
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

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

      const [statsRes, usersRes, issuesRes, estimationRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users-stats'),
        api.get('/issues/'),
        api.get('/admin/conflicting-estimates'),
      ]);

      setStats(statsRes.data);

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

      if (issuesRes.data && Array.isArray(issuesRes.data)) {
        setIssues(issuesRes.data);
      }

      setEstimationStats(estimationRes.data || []);
    } catch (err) {
      console.error('Failed to load admin data:', err);
      setError(err.response?.data?.detail || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const checkPermission = () => {
    if (!isAdmin) {
      setPermissionError('You do not have permission to perform this action. Admin rights required.');
      setTimeout(() => setPermissionError(null), 5000);
      return false;
    }
    return true;
  };

  // Password Reset Handlers
  const handleOpenResetDialog = (user) => {
    if (!checkPermission()) return;

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
    if (!checkPermission()) return;

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
      if (err.response?.status === 403) {
        setResetError('Permission denied. Admin rights required.');
      } else {
        setResetError(err.response?.data?.detail || 'Failed to reset password');
      }
    } finally {
      setResetLoading(false);
    }
  };

  // Add User Handlers
  const handleOpenAddUserDialog = () => {
    if (!checkPermission()) return;

    setNewUserData({ email: '', full_name: '', password: '' });
    setAddUserError(null);
    setAddUserMessage(null);
    setAddUserDialog(true);
  };

  const handleCloseAddUserDialog = () => {
    setAddUserDialog(false);
    setNewUserData({ email: '', full_name: '', password: '' });
  };

  const handleAddUser = async () => {
    if (!checkPermission()) return;

    setAddUserError(null);
    setAddUserMessage(null);

    if (!newUserData.email || !newUserData.full_name || !newUserData.password) {
      setAddUserError('All fields are required');
      return;
    }

    if (!newUserData.email.includes('@')) {
      setAddUserError('Invalid email format');
      return;
    }

    if (newUserData.password.length < 8) {
      setAddUserError('Password must be at least 8 characters');
      return;
    }

    setAddUserLoading(true);

    try {
      await api.post('/auth/register', {
        email: newUserData.email,
        full_name: newUserData.full_name,
        password: newUserData.password,
      });

      setAddUserMessage(`✅ User ${newUserData.email} created successfully`);
      setTimeout(() => {
        handleCloseAddUserDialog();
        loadAdminData();
      }, 2000);
    } catch (err) {
      console.error('Failed to create user:', err);
      if (err.response?.status === 403) {
        setAddUserError('Permission denied. Admin rights required.');
      } else {
        setAddUserError(err.response?.data?.detail || 'Failed to create user');
      }
    } finally {
      setAddUserLoading(false);
    }
  };

  // Delete User Handlers
  const handleOpenDeleteDialog = (user) => {
    if (!checkPermission()) return;

    setUserToDelete(user);
    setDeleteError(null);
    setDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialog(false);
    setUserToDelete(null);
  };

  const handleDeleteUser = async () => {
    if (!checkPermission()) return;

    setDeleteError(null);
    setDeleteLoading(true);

    try {
      await api.delete(`/users/${userToDelete.id}`);
      setAddUserMessage(`✅ User ${userToDelete.email} deleted successfully`);
      setTimeout(() => {
        handleCloseDeleteDialog();
        loadAdminData();
      }, 2000);
    } catch (err) {
      console.error('Failed to delete user:', err);
      if (err.response?.status === 403) {
        setDeleteError('Permission denied. Admin rights required.');
      } else {
        setDeleteError(err.response?.data?.detail || 'Failed to delete user');
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  // Toggle User Status Handler
  const handleToggleUserStatus = async (user) => {
    if (currentUser && user.id === currentUser.id) {
      setPermissionError('You cannot change your own status to prevent self-lockout.');
      setTimeout(() => setPermissionError(null), 5000);
      return;
    }

    if (!checkPermission()) return;

    try {
      const updatedUsers = users.map((u) =>
        u.id === user.id ? { ...u, is_active: !u.is_active } : u
      );
      setUsers(updatedUsers);

      await api.put(`/users/${user.id}`, {
        is_active: !user.is_active,
      });
    } catch (err) {
      console.error('Failed to update user status:', err);

      if (err.response?.status === 403) {
        setPermissionError('Permission denied. Admin rights required.');
      } else if (err.response?.data?.detail) {
        setPermissionError(`Error: ${err.response.data.detail}`);
      } else {
        setPermissionError(`Failed to update user status: ${err.message}`);
      }
      setTimeout(() => setPermissionError(null), 6000);

      // Revert changes on error
      loadAdminData();
    }
  };

  const filteredIssues = showOnlyPending
    ? issues.filter((issue) => !issue.is_estimated)
    : issues;

  if (!isAdmin && !loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
        }}
      >
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
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Typography variant="h4">🛠️ Admin Panel</Typography>
        <IconButton onClick={loadAdminData} title="Refresh data">
          <RefreshIcon />
        </IconButton>
      </Box>

      {/* Global Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {permissionError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {permissionError}
        </Alert>
      )}

      {addUserMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {addUserMessage}
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

      {/* Tab 0: Statistics */}
      {activeTab === 0 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>
            📊 System Overview
          </Typography>

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

          <Typography variant="h6" sx={{ mb: 2, mt: 3 }}>
            ⚠️ Issues with Conflicting Estimates
          </Typography>

          {estimationStats.length > 0 ? (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#fff3e0' }}>
                    <TableCell>
                      <strong>Issue</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Title</strong>
                    </TableCell>
                    <TableCell align="center">
                      <strong>Estimates</strong>
                    </TableCell>
                    <TableCell align="center">
                      <strong>Range</strong>
                    </TableCell>
                    <TableCell align="center">
                      <strong>Variance</strong>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {estimationStats.map((stat) => (
                    <TableRow key={stat.issue_id}>
                      <TableCell sx={{ fontWeight: 'bold' }}>
                        {stat.jira_key}
                      </TableCell>
                      <TableCell>{stat.title}</TableCell>
                      <TableCell align="center">
                        <Chip label={stat.estimates_count} size="small" />
                      </TableCell>
                      <TableCell align="center">
                        {stat.min_points} - {stat.max_points}
                      </TableCell>
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

      {/* Tab 1: Users */}
      {activeTab === 1 && (
        <Box>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <Typography variant="h6">👥 User Management</Typography>
            <Tooltip title={isAdmin ? 'Add new user' : 'Admin rights required'}>
              <span>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleOpenAddUserDialog}
                  disabled={!isAdmin}
                >
                  Add User
                </Button>
              </span>
            </Tooltip>
          </Box>

          {users.length > 0 ? (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell>
                      <strong>Email</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Full Name</strong>
                    </TableCell>
                    <TableCell align="center">
                      <strong>Role</strong>
                    </TableCell>
                    <TableCell align="center">
                      <strong>Status</strong>
                    </TableCell>
                    <TableCell align="right">
                      <strong>Estimates</strong>
                    </TableCell>
                    <TableCell align="right">
                      <strong>Sessions</strong>
                    </TableCell>
                    <TableCell align="center">
                      <strong>Actions</strong>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => {
                    const isCurrentUser =
                      currentUser && user.id === currentUser.id;

                    return (
                      <TableRow
                        key={user.id}
                        sx={{ opacity: isCurrentUser ? 0.7 : 1 }}
                      >
                        <TableCell>
                          {user.email}
                          {isCurrentUser && ' 👤 (You)'}
                        </TableCell>
                        <TableCell>{user.full_name}</TableCell>
                        <TableCell align="center">
                          {user.is_admin ? (
                            <Chip
                              label="Admin"
                              color="primary"
                              size="small"
                            />
                          ) : (
                            <Chip
                              label="User"
                              variant="outlined"
                              size="small"
                            />
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip
                            title={
                              isCurrentUser
                                ? 'You cannot change your own status'
                                : isAdmin
                                ? 'Click to toggle status'
                                : 'Admin rights required'
                            }
                          >
                            <Chip
                              label={
                                user.is_active ? 'Active' : 'Inactive'
                              }
                              color={
                                user.is_active ? 'success' : 'default'
                              }
                              size="small"
                              onClick={() =>
                                !isCurrentUser &&
                                handleToggleUserStatus(user)
                              }
                              sx={{
                                cursor: isCurrentUser
                                  ? 'not-allowed'
                                  : isAdmin
                                  ? 'pointer'
                                  : 'not-allowed',
                                opacity: isCurrentUser
                                  ? 0.5
                                  : isAdmin
                                  ? 1
                                  : 0.6,
                              }}
                            />
                          </Tooltip>
                        </TableCell>
                        <TableCell align="right">
                          {user.total_estimates}
                        </TableCell>
                        <TableCell align="right">
                          {user.participated_sessions}
                        </TableCell>
                        <TableCell align="center">
                          <Box
                            sx={{
                              display: 'flex',
                              gap: 0.5,
                              justifyContent: 'center',
                            }}
                          >
                            <Tooltip
                              title={
                                isAdmin
                                  ? 'Reset password'
                                  : 'Admin rights required'
                              }
                            >
                              <span>
                                <Button
                                  startIcon={<VpnKeyIcon />}
                                  size="small"
                                  variant="outlined"
                                  onClick={() =>
                                    handleOpenResetDialog(user)
                                  }
                                  disabled={!isAdmin}
                                >
                                  Reset
                                </Button>
                              </span>
                            </Tooltip>
                            <Tooltip
                              title={
                                isAdmin
                                  ? 'Delete user'
                                  : 'Admin rights required'
                              }
                            >
                              <span>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() =>
                                    handleOpenDeleteDialog(user)
                                  }
                                  disabled={!isAdmin}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Alert severity="info">No users found</Alert>
          )}
        </Box>
      )}

      {/* Tab 2: Issues */}
      {activeTab === 2 && (
        <Box>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
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
              <Typography
                variant="caption"
                color="textSecondary"
                sx={{ mb: 1, display: 'block' }}
              >
                Showing {filteredIssues.length} of {issues.length} issues
                {showOnlyPending &&
                  ` (pending: ${issues.filter((i) => !i.is_estimated).length})`}
              </Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                      <TableCell>
                        <strong>Issue Key</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Title</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Session</strong>
                      </TableCell>
                      <TableCell align="center">
                        <strong>Current Estimate</strong>
                      </TableCell>
                      <TableCell align="center">
                        <strong>Status</strong>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredIssues.map((issue) => (
                      <TableRow
                        key={issue.id}
                        sx={{
                          backgroundColor: !issue.is_estimated
                            ? '#fff9c4'
                            : 'inherit',
                          '&:hover': {
                            backgroundColor: !issue.is_estimated
                              ? '#ffeb3b'
                              : '#f5f5f5',
                          },
                        }}
                      >
                        <TableCell sx={{ fontWeight: 'bold' }}>
                          {issue.jira_key}
                        </TableCell>
                        <TableCell>{issue.title}</TableCell>
                        <TableCell>
                          {issue.session_name || 'N/A'}
                        </TableCell>
                        <TableCell align="center">
                          {issue.story_points ? (
                            <Chip
                              label={`${issue.story_points} pts`}
                              color="success"
                            />
                          ) : (
                            <Chip label="Not set" variant="outlined" />
                          )}
                        </TableCell>
                        <TableCell align="center">
                          {issue.is_estimated ? (
                            <Chip
                              label="Estimated"
                              color="success"
                              size="small"
                            />
                          ) : (
                            <Chip
                              label="Pending"
                              color="warning"
                              size="small"
                            />
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
                : 'No issues found'}
            </Alert>
          )}
        </Box>
      )}

      {/* Reset Password Dialog */}
      <Dialog
        open={resetDialog}
        onClose={handleCloseResetDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>🔐 Reset Password</DialogTitle>
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
            startIcon={
              resetLoading ? <CircularProgress size={20} /> : <VpnKeyIcon />
            }
          >
            {resetLoading ? 'Resetting...' : 'Reset Password'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog
        open={addUserDialog}
        onClose={handleCloseAddUserDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>👥 Add New User</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {addUserMessage && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {addUserMessage}
            </Alert>
          )}
          {addUserError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {addUserError}
            </Alert>
          )}

          <TextField
            fullWidth
            label="Email"
            type="email"
            value={newUserData.email}
            onChange={(e) =>
              setNewUserData({ ...newUserData, email: e.target.value })
            }
            disabled={addUserLoading}
            margin="normal"
            placeholder="user@example.com"
          />
          <TextField
            fullWidth
            label="Full Name"
            value={newUserData.full_name}
            onChange={(e) =>
              setNewUserData({ ...newUserData, full_name: e.target.value })
            }
            disabled={addUserLoading}
            margin="normal"
            placeholder="John Doe"
          />
          <TextField
            fullWidth
            label="Password"
            type="password"
            value={newUserData.password}
            onChange={(e) =>
              setNewUserData({ ...newUserData, password: e.target.value })
            }
            disabled={addUserLoading}
            margin="normal"
            placeholder="Minimum 8 characters"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddUserDialog} disabled={addUserLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleAddUser}
            variant="contained"
            disabled={addUserLoading}
            startIcon={
              addUserLoading ? <CircularProgress size={20} /> : <AddIcon />
            }
          >
            {addUserLoading ? 'Creating...' : 'Create User'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog
        open={deleteDialog}
        onClose={handleCloseDeleteDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>⚠️ Delete User</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {deleteError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {deleteError}
            </Alert>
          )}
          <Typography>
            Are you sure you want to delete user{' '}
            <strong>{userToDelete?.email}</strong>?
          </Typography>
          <Typography
            variant="caption"
            color="error"
            sx={{ display: 'block', mt: 1 }}
          >
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} disabled={deleteLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteUser}
            variant="contained"
            color="error"
            disabled={deleteLoading}
            startIcon={
              deleteLoading ? (
                <CircularProgress size={20} />
              ) : (
                <DeleteIcon />
              )
            }
          >
            {deleteLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Admin;
