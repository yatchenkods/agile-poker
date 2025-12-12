import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Chip,
  CircularProgress,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';

import EstimationCard from './EstimationCard';
import { api } from '../services/api';

function SessionBoard({ session, issues }) {
  const [selectedIssue, setSelectedIssue] = useState(issues[0] || null);
  const [estimates, setEstimates] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingEstimates, setLoadingEstimates] = useState(true);

  // Fetch current user and all estimates
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get current user
        const userRes = await api.get('/auth/me');
        setCurrentUser(userRes.data);

        // Get estimates for all issues in the session
        const estimatesRes = await api.get('/estimates/', {
          params: { session_id: session.id },
        });

        // Group estimates by issue_id
        const estimatesByIssue = {};
        estimatesRes.data.forEach((estimate) => {
          if (!estimatesByIssue[estimate.issue_id]) {
            estimatesByIssue[estimate.issue_id] = {};
          }
          estimatesByIssue[estimate.issue_id][estimate.user_id] = estimate.story_points;
        });

        setEstimates(estimatesByIssue);
      } catch (err) {
        console.error('Failed to fetch estimates:', err);
      } finally {
        setLoadingEstimates(false);
      }
    };

    if (session.id) {
      fetchData();
    }
  }, [session.id]);

  const handleEstimateSubmitted = (issueId, points) => {
    // Update local state with new estimate
    setEstimates((prev) => ({
      ...prev,
      [issueId]: {
        ...prev[issueId],
        [currentUser.id]: points,
      },
    }));
  };

  const getIssueEstimateStatus = (issue) => {
    const issueEstimates = estimates[issue.id] || {};
    const userEstimate = currentUser ? issueEstimates[currentUser.id] : null;

    return {
      hasUserEstimate: !!userEstimate,
      userEstimate,
      totalEstimates: Object.keys(issueEstimates).length,
      isFinal: !!issue.story_points,
      finalPoints: issue.story_points,
    };
  };

  if (loadingEstimates) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Grid container spacing={2}>
      {/* Issues List - Left Side */}
      <Grid item xs={12} md={4}>
        <Typography variant="h6" gutterBottom>
          📋 Issues ({issues.length})
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: '75vh', overflowY: 'auto' }}>
          {issues.map((issue) => {
            const status = getIssueEstimateStatus(issue);

            return (
              <Card
                key={issue.id}
                onClick={() => setSelectedIssue(issue)}
                sx={{
                  cursor: 'pointer',
                  backgroundColor: selectedIssue?.id === issue.id ? '#e3f2fd' : 'inherit',
                  '&:hover': { boxShadow: 2 },
                  transition: 'all 0.2s',
                  border: status.isFinal ? '2px solid #4caf50' : 'none',
                }}
              >
                <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 1 }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" noWrap sx={{ fontWeight: 'bold' }}>
                        {issue.jira_key}
                      </Typography>
                      <Typography variant="caption" color="textSecondary" noWrap>
                        {issue.title}
                      </Typography>
                    </Box>

                    {/* Estimate Badge */}
                    <Box sx={{ display: 'flex', gap: 0.5, flexDirection: 'column', alignItems: 'flex-end', minWidth: 'fit-content' }}>
                      {status.isFinal ? (
                        <Chip
                          label={`${status.finalPoints}`}
                          size="small"
                          color="success"
                          variant="filled"
                          icon={<CheckCircleIcon />}
                          sx={{ fontWeight: 'bold' }}
                        />
                      ) : status.hasUserEstimate ? (
                        <Chip
                          label={`${status.userEstimate}`}
                          size="small"
                          color="primary"
                          variant="outlined"
                          icon={<PendingIcon />}
                        />
                      ) : (
                        <Chip label="—" size="small" variant="outlined" />
                      )}

                      {/* Show total estimates count */}
                      {status.totalEstimates > 0 && (
                        <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.65rem' }}>
                          {status.totalEstimates} vote{status.totalEstimates !== 1 ? 's' : ''}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      </Grid>

      {/* Estimation Area - Right Side */}
      <Grid item xs={12} md={8}>
        {selectedIssue ? (
          <EstimationCard
            issue={selectedIssue}
            session={session}
            onEstimateSubmitted={handleEstimateSubmitted}
          />
        ) : (
          <Typography color="textSecondary">Select an issue to start estimating</Typography>
        )}
      </Grid>
    </Grid>
  );
}

export default SessionBoard;
