import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, Button, Alert } from '@mui/material';

import { api } from '../services/api';

const STORY_POINTS = [1, 2, 4, 8, 16];

function EstimationCard({ issue, session }) {
  const [selectedPoints, setSelectedPoints] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Not authenticated');
          return;
        }

        const res = await api.get('/auth/me');
        setUser(res.data);
      } catch (err) {
        console.error('Failed to fetch current user:', err);
        setError('Failed to load user data');
      }
    };

    fetchCurrentUser();
  }, []);

  const handleSubmitEstimate = async () => {
    if (!selectedPoints || !user) return;

    setLoading(true);
    setError(null);
    try {
      await api.post('/estimates/', {
        session_id: session.id,
        issue_id: issue.id,
        story_points: selectedPoints,
        user_id: user.id,
      });
      setSubmitted(true);
      setSelectedPoints(null);
      setTimeout(() => setSubmitted(false), 3000);
    } catch (err) {
      console.error('Failed to submit estimate:', err);
      const errorMessage = err.response?.data?.detail ||
                          err.response?.data?.message ||
                          'Failed to submit estimate';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (error) {
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
        <Typography variant="h6" gutterBottom>
          {issue.jira_key}: {issue.title}
        </Typography>
        <Typography variant="body2" color="textSecondary" paragraph>
          {issue.description}
        </Typography>

        {issue.story_points && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Estimated: <strong>{issue.story_points} story points</strong>
          </Alert>
        )}

        <Typography variant="subtitle2" gutterBottom>
          Your Estimate:
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
            disabled={!selectedPoints || loading || !user}
          >
            {loading ? 'Submitting...' : 'Submit Estimate'}
          </Button>
        </Box>

        {submitted && (
          <Alert severity="success" sx={{ mt: 2 }}>
            ✅ Estimate submitted!
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

export default EstimationCard;
