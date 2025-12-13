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

  // Parse description with support for links and formatting
  const parseDescription = (description) => {
    if (!description) return null;

    const lines = description.split('\n');
    const elements = [];

    lines.forEach((line, lineIdx) => {
      if (!line.trim()) {
        elements.push(<br key={`empty-${lineIdx}`} />);
        return;
      }

      // Parse line for markdown-style links [text](url) and bare URLs
      const parts = [];
      let lastIndex = 0;

      // Match both [text](url) and bare URLs
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)|\bhttps?:\/\/[^\s)\]]+|github\.com\/[^\s)\]]+/gi;
      let match;

      while ((match = linkRegex.exec(line)) !== null) {
        // Add text before link
        if (match.index > lastIndex) {
          parts.push(line.substring(lastIndex, match.index));
        }

        if (match[1] && match[2]) {
          // Markdown link [text](url)
          parts.push(
            <Link
              key={`link-${match.index}`}
              href={match[2]}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                color: 'primary.main',
                textDecoration: 'underline',
                '&:hover': {
                  color: 'primary.dark',
                  textDecoration: 'underline',
                },
              }}
            >
              {match[1]}
            </Link>
          );
        } else {
          // Bare URL
          const url = match[0].includes('github.com/') ? `https://${match[0]}` : match[0];
          const displayText = match[0].length > 50 ? `${match[0].substring(0, 47)}...` : match[0];
          parts.push(
            <Link
              key={`link-${match.index}`}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                color: 'primary.main',
                textDecoration: 'underline',
                wordBreak: 'break-all',
                '&:hover': {
                  color: 'primary.dark',
                  textDecoration: 'underline',
                },
              }}
            >
              {displayText}
            </Link>
          );
        }

        lastIndex = match.index + match[0].length;
      }

      // Add remaining text
      if (lastIndex < line.length) {
        parts.push(line.substring(lastIndex));
      }

      // Handle special formatting in the line
      const formattedParts = formatLineText(parts);

      // Add line with formatted content
      elements.push(
        <Box key={`line-${lineIdx}`} sx={{ display: 'block', mb: 0.5 }}>
          {formattedParts.length > 0 ? formattedParts : line}
        </Box>
      );
    });

    return elements.length > 0 ? elements : null;
  };

  // Apply text formatting (bold, italic, code, etc.)
  const formatLineText = (parts) => {
    return parts.map((part, idx) => {
      if (typeof part !== 'string') {
        return part; // It's already a React component (Link)
      }

      const formatted = [];
      let lastIndex = 0;

      // Bold: **text**
      let boldRegex = /\*\*([^*]+)\*\*/g;
      let match;
      const textParts = [];

      while ((match = boldRegex.exec(part)) !== null) {
        if (match.index > lastIndex) {
          textParts.push(part.substring(lastIndex, match.index));
        }
        textParts.push(
          <strong key={`bold-${idx}-${match.index}`}>{match[1]}</strong>
        );
        lastIndex = match.index + match[0].length;
      }

      if (lastIndex < part.length) {
        textParts.push(part.substring(lastIndex));
      }

      // Italic: *text* or _text_
      formatted.push(...textParts.map((tp, tpIdx) => {
        if (typeof tp !== 'string') return tp;
        const italicParts = [];
        let iLastIndex = 0;
        const italicRegex = /([*_])([^*_]+)\1/g;

        while ((match = italicRegex.exec(tp)) !== null) {
          if (match.index > iLastIndex) {
            italicParts.push(tp.substring(iLastIndex, match.index));
          }
          italicParts.push(
            <em key={`italic-${idx}-${tpIdx}-${match.index}`}>{match[2]}</em>
          );
          iLastIndex = match.index + match[0].length;
        }

        if (iLastIndex < tp.length) {
          italicParts.push(tp.substring(iLastIndex));
        }

        return italicParts.length > 0 ? italicParts : tp;
      }).flat());

      return formatted;
    });
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
            {issue.description && (
              <Typography
                variant="body2"
                color="textSecondary"
                component="div"
                sx={{
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word',
                  fontFamily: 'inherit',
                  lineHeight: 1.6,
                  mt: 1,
                  '& strong': {
                    fontWeight: 600,
                    color: 'inherit',
                  },
                  '& em': {
                    fontStyle: 'italic',
                    color: 'inherit',
                  },
                  '& a': {
                    color: 'primary.main',
                    textDecoration: 'underline',
                    '&:hover': {
                      color: 'primary.dark',
                    },
                  },
                }}
              >
                {parseDescription(issue.description)}
              </Typography>
            )}
          </Box>
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
