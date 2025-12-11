import React, { useState } from 'react';
import { Box, Card, CardContent, Typography, Button, Alert } from '@mui/material';

import { api } from '../services/api';

const STORY_POINTS = [1, 2, 4, 8, 16];

function EstimationCard({ issue, session }) {
  const [selectedPoints, setSelectedPoints] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmitEstimate = async () => {
    if (!selectedPoints) return;

    setLoading(true);
    try {
      await api.post('/estimates/', {
        session_id: session.id,
        issue_id: issue.id,
        story_points: selectedPoints,
      });
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    } catch (err) {
      console.error('Failed to submit estimate:', err);
    } finally {
      setLoading(false);
    }
  };

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
            disabled={!selectedPoints || loading}
          >
            Submit Estimate
          </Button>
        </Box>

        {submitted && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Estimate submitted!
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

export default EstimationCard;
