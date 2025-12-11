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
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';

import { api } from '../services/api';

function Admin() {
  const [stats, setStats] = useState(null);
  const [conflicts, setConflicts] = useState([]);
  const [usersStats, setUsersStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      const [statsRes, conflictsRes, usersRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/conflicting-estimates'),
        api.get('/admin/users-stats'),
      ]);
      setStats(statsRes.data);
      setConflicts(conflictsRes.data);
      setUsersStats(usersRes.data);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Typography>Loading admin dashboard...</Typography>;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Admin Dashboard
      </Typography>

      {/* Statistics */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Users
                </Typography>
                <Typography variant="h5">
                  {stats.total_users}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Sessions
                </Typography>
                <Typography variant="h5">
                  {stats.total_sessions}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Issues
                </Typography>
                <Typography variant="h5">
                  {stats.total_issues}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Estimates
                </Typography>
                <Typography variant="h5">
                  {stats.total_estimates}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
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

      {/* User Statistics */}
      {usersStats.length > 0 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            User Statistics
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Email</TableCell>
                  <TableCell>Full Name</TableCell>
                  <TableCell align="right">Estimates</TableCell>
                  <TableCell align="right">Sessions</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {usersStats.map((user) => (
                  <TableRow key={user.user_id}>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.full_name}</TableCell>
                    <TableCell align="right">{user.total_estimates}</TableCell>
                    <TableCell align="right">{user.participated_sessions}</TableCell>
                    <TableCell>
                      {user.is_active ? '🟢 Active' : '🔴 Inactive'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Box>
  );
}

export default Admin;
