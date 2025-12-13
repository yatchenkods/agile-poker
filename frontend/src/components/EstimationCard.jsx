import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, Button, Alert, Divider, Link } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

import { api } from '../services/api';

const STORY_POINTS = [1, 2, 4, 8, 16];

function EstimationCard({ issue, session, onEstimateSubmitted }) {
  // Track selected points only for THIS issue
  const [selectedPoints, setSelectedPoints] = useState(null);
  // Track if joker is selected
  const [isJoker, setIsJoker] = useState(false);
  // Track user's submitted estimate for THIS issue
  const [userEstimate, setUserEstimate] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Fetch current user and their existing estimate for THIS specific issue
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Not authenticated');
          return;
        }

        // Get current user
        const userRes = await api.get('/auth/me');
        setUser(userRes.data);

        // Get estimates ONLY for THIS specific issue
        const estimatesRes = await api.get(`/estimates/`, {
          params: { issue_id: issue.id },
        });

        // Find current user's estimate for THIS issue
        const currentUserEstimate = estimatesRes.data.find(
          (e) => e.user_id === userRes.data.id
        );

        if (currentUserEstimate) {
          setUserEstimate(currentUserEstimate);
          // Initialize selectedPoints and joker status with user's existing estimate
          if (currentUserEstimate.is_joker) {
            setIsJoker(true);
            setSelectedPoints(null);
          } else {
            setIsJoker(false);
            setSelectedPoints(currentUserEstimate.story_points);
          }
        } else {
          // No estimate yet, start fresh
          setSelectedPoints(null);
          setIsJoker(false);
          setUserEstimate(null);
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
        // Don't show error if it's just 404 from no estimates
        if (err.response?.status !== 404) {
          setError('Failed to load data');
        }
      }
    };

    fetchData();
  }, [issue.id]); // Re-fetch when issue changes

  const handleSubmitEstimate = async () => {
    if (!selectedPoints && !isJoker) return;
    if (!user || !session) return;

    setLoading(true);
    setError(null);
    try {
      await api.post('/estimates/', {
        session_id: session.id,
        issue_id: issue.id,
        story_points: selectedPoints || 0, // Joker uses 0 for story_points
        user_id: user.id,
        is_joker: isJoker,
      });

      // Update state with the new estimate for THIS issue
      const newEstimate = {
        id: userEstimate?.id,
        issue_id: issue.id,
        user_id: user.id,
        story_points: selectedPoints || 0,
        is_joker: isJoker,
      };
      setUserEstimate(newEstimate);

      setSubmitted(true);
      setIsEditing(false);
      setTimeout(() => setSubmitted(false), 3000);

      // Notify parent component
      if (onEstimateSubmitted) {
        onEstimateSubmitted(issue.id, isJoker ? 'J' : selectedPoints);
      }
    } catch (err) {
      console.error('Failed to submit estimate:', err);
      const errorMessage =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Failed to submit estimate';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Build Jira URL if not provided
  const getJiraUrl = () => {
    if (issue.jira_url) {
      return issue.jira_url;
    }
    // Try to construct URL from Jira environment variable
    const jiraUrl = process.env.REACT_APP_JIRA_URL;
    if (jiraUrl && issue.jira_key) {
      return `${jiraUrl}/browse/${issue.jira_key}`;
    }
    return null;
  };

  const jiraUrl = getJiraUrl();

  if (error && error !== 'Not authenticated') {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">{error}</Alert>
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card>
        <CardContent>
          <Typography>Loading...</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between' }}>
          <Box sx={{ flex: 1 }}>
            {/* Clickable issue title with link to Jira */}
            {jiraUrl ? (
              <Link
                href={jiraUrl}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  textDecoration: 'none',
                  color: 'inherit',
                  '&:hover': {
                    color: 'primary.main',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                  },
                }}
              >
                <Typography variant="h6" component="span" gutterBottom>
                  {issue.jira_key}: {issue.title}
                </Typography>
                <OpenInNewIcon sx={{ fontSize: '1rem', mt: 0.5 }} />
              </Link>
            ) : (
              <Typography variant="h6" gutterBottom>
                {issue.jira_key}: {issue.title}
              </Typography>
            )}
            <Typography variant="body2" color="textSecondary" paragraph>
              {issue.description}
            </Typography>
          </Box>
          {userEstimate && !isEditing && (
            <Box sx={{ textAlign: 'right', ml: 2 }}>
              <Typography variant="caption" color="textSecondary">
                {userEstimate.is_joker ? '✓ Voted' : '✓ Estimated'}
              </Typography>
            </Box>
          )}
        </Box>

        {issue.story_points && (
          <Alert severity="info" sx={{ mb: 2 }}>
            🎯 Final Estimate: <strong>{issue.story_points} story points</strong>
          </Alert>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Show edit button if already estimated and not editing */}
        {userEstimate && !isEditing && (
          <Box sx={{ mb: 2 }}>
            <Button
              startIcon={<EditIcon />}
              onClick={() => setIsEditing(true)}
              variant="outlined"
              size="small"
            >
              Change Estimate
            </Button>
          </Box>
        )}

        {/* Show estimation UI if not estimated or editing */}
        {(!userEstimate || isEditing) && (
          <>
            <Typography variant="subtitle2" gutterBottom>
              {userEstimate && isEditing ? 'Update Your Estimate:' : 'Your Estimate:'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              {STORY_POINTS.map((points) => (
                <Button
                  key={points}
                  variant={selectedPoints === points && !isJoker ? 'contained' : 'outlined'}
                  onClick={() => {
                    setSelectedPoints(points);
                    setIsJoker(false);
                  }}
                  disabled={loading}
                  sx={{ minWidth: 60 }}
                >
                  {points}
                </Button>
              ))}
              {/* Joker Card Button */}
              <Button
                variant={isJoker ? 'contained' : 'outlined'}
                onClick={() => {
                  setIsJoker(!isJoker);
                  if (!isJoker) {
                    setSelectedPoints(null);
                  }
                }}
                disabled={loading}
                sx={{
                  minWidth: 60,
                  backgroundColor: isJoker ? '#FFD700' : undefined,
                  color: isJoker ? '#000' : undefined,
                  '&:hover': {
                    backgroundColor: isJoker ? '#FFC700' : undefined,
                  },
                }}
                title="Abstain from voting (marked as voted but not counted in estimate)"
              >
                J
              </Button>
            </Box>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                onClick={handleSubmitEstimate}
                disabled={!selectedPoints && !isJoker || loading || !user || !session}
              >
                {loading ? 'Submitting...' : 'Submit Estimate'}
              </Button>
              {userEstimate && isEditing && (
                <Button
                  variant="outlined"
                  onClick={() => {
                    setIsEditing(false);
                    if (userEstimate.is_joker) {
                      setIsJoker(true);
                      setSelectedPoints(null);
                    } else {
                      setIsJoker(false);
                      setSelectedPoints(userEstimate.story_points);
                    }
                  }}
                  disabled={loading}
                >
                  Cancel
                </Button>
              )}
            </Box>
          </>
        )}

        {submitted && (
          <Alert severity="success" sx={{ mt: 2 }}>
            ✅ Estimate {userEstimate ? 'updated' : 'submitted'}!
          </Alert>
        )}

        {error && error === 'Not authenticated' && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            ⚠️ Please log in to submit estimates
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

export default EstimationCard;
