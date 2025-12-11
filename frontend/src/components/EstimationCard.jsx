import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, Button, Alert, Divider } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import { api } from '../services/api';

const STORY_POINTS = [1, 2, 4, 8, 16];

function EstimationCard({ issue, session, onEstimateSubmitted }) {
  const [selectedPoints, setSelectedPoints] = useState(null);
  const [userEstimate, setUserEstimate] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Fetch current user and their existing estimate
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

        // Get estimates for this issue to find user's estimate
        const estimatesRes = await api.get(`/estimates/`, {
          params: { issue_id: issue.id },
        });

        // Find current user's estimate
        const currentUserEstimate = estimatesRes.data.find(
          (e) => e.user_id === userRes.data.id
        );

        if (currentUserEstimate) {
          setUserEstimate(currentUserEstimate);
          setSelectedPoints(currentUserEstimate.story_points);
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
  }, [issue.id]);

  const handleSubmitEstimate = async () => {
    if (!selectedPoints || !user || !session) return;

    setLoading(true);
    setError(null);
    try {
      await api.post('/estimates/', {
        session_id: session.id,
        issue_id: issue.id,
        story_points: selectedPoints,
        user_id: user.id,
      });

      // Update state with the new estimate
      setUserEstimate({
        id: userEstimate?.id,
        issue_id: issue.id,
        user_id: user.id,
        story_points: selectedPoints,
      });

      setSubmitted(true);
      setIsEditing(false);
      setTimeout(() => setSubmitted(false), 3000);

      // Notify parent component
      if (onEstimateSubmitted) {
        onEstimateSubmitted(issue.id, selectedPoints);
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
            <Typography variant="h6" gutterBottom>
              {issue.jira_key}: {issue.title}
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              {issue.description}
            </Typography>
          </Box>
          {userEstimate && !isEditing && (
            <Box sx={{ textAlign: 'right', ml: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <CheckCircleIcon sx={{ color: 'success.main', fontSize: '1.5rem' }} />
                <Typography variant="h6" sx={{ color: 'success.main' }}>
                  {userEstimate.story_points}
                </Typography>
              </Box>
              <Typography variant="caption" color="textSecondary">
                Your estimate
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
                  variant={selectedPoints === points ? 'contained' : 'outlined'}
                  onClick={() => setSelectedPoints(points)}
                  disabled={loading}
                  sx={{ minWidth: 60 }}
                >
                  {points}
                </Button>
              ))}
            </Box>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                onClick={handleSubmitEstimate}
                disabled={!selectedPoints || loading || !user || !session}
              >
                {loading ? 'Submitting...' : 'Submit Estimate'}
              </Button>
              {userEstimate && isEditing && (
                <Button
                  variant="outlined"
                  onClick={() => {
                    setIsEditing(false);
                    setSelectedPoints(userEstimate.story_points);
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
