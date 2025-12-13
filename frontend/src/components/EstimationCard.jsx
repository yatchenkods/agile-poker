import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, Button, Alert, Divider, Link } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

import { api } from '../services/api';

const STORY_POINTS = [1, 2, 4, 8, 16];

// Component to render formatted description text
function FormattedDescription({ text }) {
  if (!text) return null;

  // Split text by lines and process each line
  const lines = text.split('\n');
  const elements = [];
  let currentParagraph = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check for heading (# prefix)
    if (line.startsWith('#')) {
      // Flush current paragraph
      if (currentParagraph.length > 0) {
        elements.push(
          <Typography key={`para-${elements.length}`} variant="body2" paragraph>
            {currentParagraph.join(' ')}
          </Typography>
        );
        currentParagraph = [];
      }

      // Add heading
      const level = line.match(/^#+/)[0].length;
      const headingText = line.replace(/^#+\s*/, '');
      const variantMap = {
        1: 'h5',
        2: 'h6',
        3: 'subtitle1',
        4: 'subtitle2',
        5: 'body2',
        6: 'body2',
      };

      elements.push(
        <Typography
          key={`heading-${elements.length}`}
          variant={variantMap[level]}
          sx={{ fontWeight: 600, mt: 1, mb: 0.5 }}
        >
          {headingText}
        </Typography>
      );
    }
    // Check for list item (• or 1., 2., etc.)
    else if (line.startsWith('•') || /^\d+\.\s/.test(line)) {
      // Flush current paragraph
      if (currentParagraph.length > 0) {
        elements.push(
          <Typography key={`para-${elements.length}`} variant="body2" paragraph>
            {currentParagraph.join(' ')}
          </Typography>
        );
        currentParagraph = [];
      }

      // Add list item
      const itemText = line.replace(/^[•\d+\.\s]+/, '');
      elements.push(
        <Box key={`list-${elements.length}`} sx={{ pl: 2, mb: 0.5 }}>
          <Typography variant="body2" component="span">
            {line.startsWith('•') ? '• ' : ''}
            {itemText}
          </Typography>
        </Box>
      );
    }
    // Check for blockquote (> prefix)
    else if (line.startsWith('>')) {
      // Flush current paragraph
      if (currentParagraph.length > 0) {
        elements.push(
          <Typography key={`para-${elements.length}`} variant="body2" paragraph>
            {currentParagraph.join(' ')}
          </Typography>
        );
        currentParagraph = [];
      }

      // Add blockquote
      const quoteText = line.replace(/^>\s*/, '');
      elements.push(
        <Typography
          key={`quote-${elements.length}`}
          variant="body2"
          sx={{
            pl: 2,
            borderLeft: '3px solid #ccc',
            fontStyle: 'italic',
            color: 'textSecondary',
            mb: 1,
          }}
        >
          {quoteText}
        </Typography>
      );
    }
    // Check for code block (``` markers)
    else if (line.startsWith('```')) {
      // Skip code block markers, content inside will be handled
      continue;
    }
    // Empty line - end of paragraph
    else if (line === '') {
      if (currentParagraph.length > 0) {
        elements.push(
          <Typography key={`para-${elements.length}`} variant="body2" paragraph>
            {currentParagraph.join(' ')}
          </Typography>
        );
        currentParagraph = [];
      }
    }
    // Regular text line - add to current paragraph
    else {
      currentParagraph.push(line);
    }
  }

  // Flush remaining paragraph
  if (currentParagraph.length > 0) {
    elements.push(
      <Typography key={`para-${elements.length}`} variant="body2" paragraph>
        {currentParagraph.join(' ')}
      </Typography>
    );
  }

  // Render inline markdown-style formatting
  return (
    <Box sx={{ '& *': { wordBreak: 'break-word' } }}>
      {elements.map((element, idx) => {
        // Apply inline formatting to Typography elements
        if (element?.type?.name === 'Typography') {
          return React.cloneElement(element, {
            key: idx,
            children: renderInlineFormatting(element.props.children),
          });
        }
        return React.cloneElement(element, { key: idx });
      })}
    </Box>
  );
}

// Helper function to render inline formatting (bold, italic, code)
function renderInlineFormatting(text) {
  if (typeof text !== 'string') return text;

  const elements = [];
  let lastIndex = 0;

  // Pattern to match **bold**, *italic*, `code`, ~~strikethrough~~
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|~~[^~]+~~)/g;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      elements.push(text.substring(lastIndex, match.index));
    }

    // Process matched formatting
    const matched = match[0];
    if (matched.startsWith('**') && matched.endsWith('**')) {
      // Bold
      elements.push(
        <strong key={`bold-${elements.length}`}>
          {matched.slice(2, -2)}
        </strong>
      );
    } else if (matched.startsWith('*') && matched.endsWith('*')) {
      // Italic
      elements.push(
        <em key={`italic-${elements.length}`}>
          {matched.slice(1, -1)}
        </em>
      );
    } else if (matched.startsWith('`') && matched.endsWith('`')) {
      // Code
      elements.push(
        <code
          key={`code-${elements.length}`}
          style={{
            backgroundColor: '#f0f0f0',
            padding: '2px 4px',
            borderRadius: '3px',
            fontFamily: 'monospace',
            fontSize: '0.9em',
          }}
        >
          {matched.slice(1, -1)}
        </code>
      );
    } else if (matched.startsWith('~~') && matched.endsWith('~~')) {
      // Strikethrough
      elements.push(
        <del key={`del-${elements.length}`}>
          {matched.slice(2, -2)}
        </del>
      );
    }

    lastIndex = pattern.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    elements.push(text.substring(lastIndex));
  }

  return elements.length > 0 ? elements : text;
}

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
            {/* Render formatted description */}
            {issue.description && (
              <Box sx={{ my: 1.5, color: 'textSecondary' }}>
                <FormattedDescription text={issue.description} />
              </Box>
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
