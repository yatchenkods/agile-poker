import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Alert,
  Paper,
} from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

import { api } from '../services/api';

function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [newRole, setNewRole] = useState(null);

  // Fetch users and current user
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get current user
        const currentRes = await api.get('/auth/me');
        setCurrentUser(currentRes.data);

        // Get all users
        const usersRes = await api.get('/users/');
        setUsers(usersRes.data);
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError(err.response?.data?.detail || 'Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleRoleChange = (user, role) => {
    setSelectedUser(user);
    setNewRole(role);
    setConfirmDialog(true);
  };

  const confirmRoleChange = async () => {
    if (!selectedUser || !newRole) return;

    try {
      setError(null);
      setSuccess(null);

      // Update user role
      const updatedUser = await api.patch(`/users/${selectedUser.id}`, {
        role: newRole,
      });

      // Update local state
      setUsers(
        users.map((u) => (u.id === selectedUser.id ? updatedUser.data : u))
      );

      setSuccess(
        `${selectedUser.username}'s role changed to ${newRole.toUpperCase()}`
      );
      setConfirmDialog(false);
      setSelectedUser(null);
      setNewRole(null);
    } catch (err) {
      console.error('Failed to update user role:', err);
      setError(err.response?.data?.detail || 'Failed to update user role');
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return 'error';
      case 'user':
        return 'default';
      default:
        return 'default';
    }
  };

  const getRoleIcon = (role) => {
    return role === 'admin' ? <SecurityIcon /> : <PersonIcon />;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Check if current user is admin
  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" icon={<ErrorIcon />}>
          <Typography variant="h6">Access Denied</Typography>
          <Typography variant="body2">
            Only administrators can access this panel.
          </Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <SecurityIcon sx={{ fontSize: 32, color: 'primary.main' }} />
            <Typography variant="h5" sx={{ mb: 0 }}>
              👨‍💼 Admin Panel - User Management
            </Typography>
          </Box>
          <Typography variant="body2" color="textSecondary">
            Manage user roles and permissions. Currently viewing as: {' '}
            <strong>{currentUser.username}</strong>
          </Typography>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" icon={<CheckCircleIcon />} onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>Username</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Current Role</TableCell>
              <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} hover>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                    {user.username}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="textSecondary">
                    {user.email}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    icon={getRoleIcon(user.role)}
                    label={user.role.toUpperCase()}
                    color={getRoleColor(user.role)}
                    variant="outlined"
                    size="small"
                  />
                </TableCell>
                <TableCell sx={{ textAlign: 'center' }}>
                  {user.id === currentUser.id ? (
                    <Typography variant="caption" color="textSecondary">
                      (Current User)
                    </Typography>
                  ) : (
                    <Tooltip
                      title={`Change ${user.username}'s role`}
                    >
                      <Button
                        size="small"
                        variant="outlined"
                        color={user.role === 'admin' ? 'error' : 'primary'}
                        onClick={() =>
                          handleRoleChange(
                            user,
                            user.role === 'admin' ? 'user' : 'admin'
                          )
                        }
                      >
                        {user.role === 'admin' ? 'Revoke Admin' : 'Make Admin'}
                      </Button>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {users.length === 0 && (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="textSecondary">No users found</Typography>
        </Box>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog} onClose={() => setConfirmDialog(false)}>
        <DialogTitle>⚠️ Change User Role</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to change <strong>{selectedUser?.username}</strong>'s
            role to <strong>{newRole?.toUpperCase()}</strong>?
            {newRole === 'admin' && (
              <Box sx={{ mt: 2, p: 1.5, bgcolor: '#fff3cd', borderRadius: 1 }}>
                <Typography variant="caption" color="warning.dark">
                  ⚠️ They will have full administrative access to the system.
                </Typography>
              </Box>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog(false)}>Cancel</Button>
          <Button
            onClick={confirmRoleChange}
            variant="contained"
            color={newRole === 'admin' ? 'error' : 'primary'}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default AdminPanel;
