import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Button,
  Alert,
} from '@mui/material';

import { api } from '../services/api';
import SessionBoard from '../components/SessionBoard';

function SessionDetail() {
  const { sessionId } = useParams();
  const [session, setSession] = useState(null);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSessionData();
    // Setup WebSocket connection
    setupWebSocket();
  }, [sessionId]);

  const loadSessionData = async () => {
    try {
      const [sessionRes, issuesRes] = await Promise.all([
        api.get(`/sessions/${sessionId}`),
        api.get(`/issues/?session_id=${sessionId}`),
      ]);
      setSession(sessionRes.data);
      setIssues(issuesRes.data);
    } catch (err) {
      setError('Failed to load session data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const setupWebSocket = () => {
    const token = localStorage.getItem('token');
    const wsUrl = `${process.env.REACT_APP_WS_URL || 'ws://localhost:8000'}/ws/session/${sessionId}?token=${token}`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'estimate_update') {
        // Update estimates in real-time
        console.log('Estimate updated:', data.data);
        // Reload issues to get updated estimates
        loadSessionData();
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  };

  if (loading) {
    return <Typography>Loading session...</Typography>;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box>
      {session && (
        <>
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" gutterBottom>
              {session.name}
            </Typography>
            {session.description && (
              <Typography variant="body1" color="textSecondary" gutterBottom>
                {session.description}
              </Typography>
            )}
            <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
              <Typography variant="body2">
                Status: <strong>{session.status}</strong>
              </Typography>
              <Typography variant="body2">
                Participants: <strong>{session.participant_count}</strong>
              </Typography>
            </Box>
          </Box>

          <SessionBoard session={session} issues={issues} />
        </>
      )}
    </Box>
  );
}

export default SessionDetail;
