import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, Button, Alert, Divider, Link, Chip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

import { api } from '../services/api';

const STORY_POINTS = [1, 2, 4, 8, 16];

// Common programming languages for syntax highlighting themes
const LANGUAGE_COLORS = {
  python: '#3776ab',
  javascript: '#f7df1e',
  typescript: '#3178c6',
  java: '#007396',
  cpp: '#00599c',
  c: '#a8b9cc',
  csharp: '#239120',
  php: '#777bb4',
  ruby: '#cc342d',
  go: '#00add8',
  rust: '#ce422b',
  kotlin: '#7f52ff',
  swift: '#fa7343',
  sql: '#336791',
  bash: '#4eaa25',
  shell: '#4eaa25',
  html: '#e34c26',
  css: '#563d7c',
  json: '#292929',
  xml: '#666666',
  yaml: '#cb171e',
  markdown: '#083fa1',
};

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

  // Parse description with support for links, formatting, lists, and code blocks
  const parseDescription = (description) => {
    if (!description) return null;

    const lines = description.split('\n');
    const elements = [];
    let inCodeBlock = false;
    let codeBlockLanguage = '';
    let codeBlockLines = [];
    let codeBlockStartIdx = null;

    const flushCodeBlock = (idx) => {
      if (codeBlockLines.length > 0) {
        const codeContent = codeBlockLines.join('\n').trim();
        const bgColor = LANGUAGE_COLORS[codeBlockLanguage.toLowerCase()] || '#2d2d2d';
        const textColor = ['javascript', 'json', 'css'].includes(codeBlockLanguage.toLowerCase()) ? '#fff' : '#f8f8f2';

        elements.push(
          <Box
            key={`codeblock-${idx}`}
            sx={{
              display: 'block',
              position: 'relative',
              backgroundColor: bgColor,
              color: textColor,
              padding: '16px',
              paddingTop: codeBlockLanguage ? '40px' : '16px',
              borderRadius: '6px',
              fontFamily: 'monospace',
              fontSize: '0.9em',
              lineHeight: '1.5',
              overflow: 'auto',
              mb: 2,
              border: '1px solid rgba(0,0,0,0.1)',
            }}
          >
            {codeBlockLanguage && (
              <Box
                sx={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  backgroundColor: 'rgba(0,0,0,0.25)',
                  color: 'inherit',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '0.75em',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  fontFamily: 'sans-serif',
                  letterSpacing: '0.5px',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
              >
                {codeBlockLanguage}
              </Box>
            )}
            <pre style={{ margin: 0, overflow: 'auto', fontFamily: 'monospace' }}>{codeContent}</pre>
          </Box>
        );
      }
      codeBlockLines = [];
      codeBlockLanguage = '';
      codeBlockStartIdx = null;
    };

    lines.forEach((line, lineIdx) => {
      // Check for code block start/end
      const codeBlockMatch = line.match(/^```(\w*)/);

      if (codeBlockMatch) {
        if (inCodeBlock) {
          // End of code block
          flushCodeBlock(lineIdx);
          inCodeBlock = false;
        } else {
          // Start of code block
          inCodeBlock = true;
          codeBlockLanguage = codeBlockMatch[1] || '';
          codeBlockStartIdx = lineIdx;
        }
        return; // Skip the ``` line itself
      }

      // If inside code block, collect lines
      if (inCodeBlock) {
        codeBlockLines.push(line);
        return;
      }

      // Regular content processing
      if (!line.trim()) {
        elements.push(<br key={`empty-${lineIdx}`} />);
        return;
      }

      // Check if line is a list item or special format
      const listItemMatch = line.match(/^(\s*)([•◦▪\-\*]|\d+\.)\s+(.*)$/);
      const blockquoteMatch = line.match(/^>\s+(.*)$/);

      if (blockquoteMatch) {
        // Blockquote
        elements.push(
          <Box
            key={`blockquote-${lineIdx}`}
            sx={{
              display: 'block',
              borderLeft: '3px solid #ccc',
              paddingLeft: '12px',
              marginLeft: '0px',
              fontStyle: 'italic',
              color: 'rgba(0,0,0,0.6)',
              mb: 0.5,
            }}
          >
            {blockquoteMatch[1]}
          </Box>
        );
      } else if (listItemMatch) {
        // List item
        const indent = listItemMatch[1].length;
        const bullet = listItemMatch[2];
        const content = listItemMatch[3];

        // Parse links and formatting in list item content
        const listParts = parseLineContent(content);

        elements.push(
          <Box
            key={`list-${lineIdx}`}
            sx={{
              display: 'block',
              marginLeft: `${indent * 8}px`,
              marginBottom: '4px',
              '& strong': {
                fontWeight: 600,
              },
              '& em': {
                fontStyle: 'italic',
              },
            }}
          >
            <span style={{ marginRight: '8px', fontWeight: 500 }}>{bullet}</span>
            {listParts}
          </Box>
        );
      } else {
        // Regular paragraph
        const parts = parseLineContent(line);

        elements.push(
          <Box key={`line-${lineIdx}`} sx={{ display: 'block', mb: 0.5 }}>
            {parts}
          </Box>
        );
      }
    });

    // Flush any remaining code block
    if (inCodeBlock) {
      flushCodeBlock(lines.length);
    }

    return elements.length > 0 ? elements : null;
  };

  // Parse line content for links and formatting
  const parseLineContent = (line) => {
    const parts = [];
    let lastIndex = 0;

    // Match both [text](url) and bare URLs
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)|\bhttps?:\/\/[^\s)\]]+|github\.com\/[^\s)\]]+/gi;
    let match;

    while ((match = linkRegex.exec(line)) !== null) {
      // Add text before link
      if (match.index > lastIndex) {
        const textBefore = line.substring(lastIndex, match.index);
        const formatted = applyTextFormatting(textBefore);
        parts.push(formatted);
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
      const remaining = line.substring(lastIndex);
      const formatted = applyTextFormatting(remaining);
      parts.push(formatted);
    }

    return parts.length > 0 ? parts : line;
  };

  // Apply text formatting (bold, italic, code, strikethrough)
  const applyTextFormatting = (text) => {
    if (!text) return text;

    const elements = [];
    let lastIndex = 0;

    // Process all formatting in order: bold, italic, code, strikethrough
    const formattingRules = [
      { regex: /\*\*([^*]+)\*\*/g, tag: 'strong', wrap: (content) => <strong key={`${Math.random()}`}>{content}</strong> },
      { regex: /(?<!\*)\*([^*]+)\*(?!\*)/g, tag: 'em', wrap: (content) => <em key={`${Math.random()}`}>{content}</em> },
      { regex: /_([^_]+)_/g, tag: 'em', wrap: (content) => <em key={`${Math.random()}`}>{content}</em> },
      { regex: /`([^`]+)`/g, tag: 'code', wrap: (content) => <code key={`${Math.random()}`} style={{ backgroundColor: 'rgba(0,0,0,0.05)', padding: '2px 4px', borderRadius: '3px', fontFamily: 'monospace', fontSize: '0.9em' }}>{content}</code> },
      { regex: /~~([^~]+)~~/g, tag: 'del', wrap: (content) => <del key={`${Math.random()}`}>{content}</del> },
    ];

    // Simple approach: apply formatting sequentially
    let result = [text];

    formattingRules.forEach((rule) => {
      const newResult = [];
      result.forEach((part) => {
        if (typeof part === 'string') {
          let lastIdx = 0;
          let match;
          const tempElements = [];

          while ((match = rule.regex.exec(part)) !== null) {
            if (match.index > lastIdx) {
              tempElements.push(part.substring(lastIdx, match.index));
            }
            tempElements.push(rule.wrap(match[1]));
            lastIdx = match.index + match[0].length;
          }

          if (lastIdx < part.length) {
            tempElements.push(part.substring(lastIdx));
          }

          newResult.push(...(tempElements.length > 0 ? tempElements : [part]));
        } else {
          newResult.push(part);
        }
      });

      result = newResult;
    });

    return result;
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
                  '& code': {
                    fontFamily: 'monospace',
                    fontSize: '0.9em',
                  },
                  '& pre': {
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word',
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
