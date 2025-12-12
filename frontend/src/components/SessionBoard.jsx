import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import DeleteIcon from '@mui/icons-material/Delete';

import EstimationCard from './EstimationCard';
import { api } from '../services/api';

function SessionBoard({ session, issues, isCreator = false, onDeleteIssue = null }) {
  const [selectedIssue, setSelectedIssue] = useState(issues[0] || null);
  const [estimates, setEstimates] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingEstimates, setLoadingEstimates] = useState(true);
  const [hoveredIssueId, setHoveredIssueId] = useState(null);

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

  // Update selected issue when issues change
  useEffect(() => {
    if (issues.length > 0 && (!selectedIssue || !issues.find(i => i.id === selectedIssue.id))) {
      setSelectedIssue(issues[0]);
    } else if (issues.length === 0) {
      setSelectedIssue(null);
    }
  }, [issues]);

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
    <Grid container spacing={2} sx={{ height: 'auto', minHeight: 'calc(100vh - 300px)' }}>
      {/* Issues List - Left Side */}
      <Grid 
        item 
        xs={12} 
        md={4} 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          minHeight: 0
        }}
      >
        <Typography variant="h6" gutterBottom sx={{ mb: 1.5 }}>
          📋 Issues ({issues.length})
        </Typography>
        
        {issues.length === 0 ? (
          <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1, textAlign: 'center' }}>
            <Typography color="textSecondary">No issues in this session yet.</Typography>
            <Typography variant="caption" color="textSecondary">Click "Add Issues" to import tasks.</Typography>
          </Box>
        ) : (
          /* Scrollable Issues Container */
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              overflowX: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              pr: 0.5, // Right padding for scrollbar
              pr: '8px',
              '&::-webkit-scrollbar': {
                width: '8px',
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: '#f1f1f1',
                borderRadius: '4px',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: '#bdbdbd',
                borderRadius: '4px',
                transition: 'background-color 0.2s',
                '&:hover': {
                  backgroundColor: '#9e9e9e',
                },
              },
            }}
          >
            {issues.map((issue) => {
              const status = getIssueEstimateStatus(issue);
              const isHovered = hoveredIssueId === issue.id;

              return (
                <Card
                  key={issue.id}
                  onClick={() => setSelectedIssue(issue)}
                  onMouseEnter={() => setHoveredIssueId(issue.id)}
                  onMouseLeave={() => setHoveredIssueId(null)}
                  sx={{
                    cursor: 'pointer',
                    backgroundColor: selectedIssue?.id === issue.id ? '#e3f2fd' : 'inherit',
                    '&:hover': { 
                      boxShadow: 2,
                      backgroundColor: selectedIssue?.id === issue.id ? '#e3f2fd' : '#fafafa',
                    },
                    transition: 'all 0.2s',
                    border: status.isFinal ? '2px solid #4caf50' : '1px solid #e0e0e0',
                    flexShrink: 0, // CRITICAL: Prevent card from shrinking
                  }}
                >
                  <CardContent sx={{ py: 1.5, px: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 1 }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" noWrap sx={{ fontWeight: 'bold' }}>
                          {issue.jira_key}
                        </Typography>
                        <Typography variant="caption" color="textSecondary" noWrap sx={{ display: 'block' }}>
                          {issue.title}
                        </Typography>
                      </Box>

                      {/* Estimate Badge and Delete Button */}
                      <Box sx={{ display: 'flex', gap: 0.5, flexDirection: 'column', alignItems: 'flex-end', minWidth: 'fit-content' }}>
                        {isCreator && isHovered && (
                          <Tooltip title="Remove issue">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onDeleteIssue) {
                                  onDeleteIssue(issue.id);
                                }
                              }}
                              sx={{ p: 0.5 }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}

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
        )}
      </Grid>

      {/* Estimation Area - Right Side */}
      <Grid 
        item 
        xs={12} 
        md={8}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0
        }}
      >
        {selectedIssue ? (
          <Box sx={{ flex: 1, overflowY: 'auto', pr: 1 }}>
            <EstimationCard
              issue={selectedIssue}
              session={session}
              onEstimateSubmitted={handleEstimateSubmitted}
            />
          </Box>
        ) : (
          <Typography color="textSecondary">Select an issue to start estimating</Typography>
        )}
      </Grid>
    </Grid>
  );
}

export default SessionBoard;
