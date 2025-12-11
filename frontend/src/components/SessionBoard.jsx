import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Button,
} from '@mui/material';

import EstimationCard from './EstimationCard';

function SessionBoard({ session, issues }) {
  const [selectedIssue, setSelectedIssue] = useState(issues[0] || null);

  return (
    <Grid container spacing={2}>
      {/* Issues List */}
      <Grid item xs={12} md={4}>
        <Typography variant="h6" gutterBottom>
          Issues ({issues.length})
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {issues.map((issue) => (
            <Card
              key={issue.id}
              onClick={() => setSelectedIssue(issue)}
              sx={{
                cursor: 'pointer',
                backgroundColor: selectedIssue?.id === issue.id ? '#e3f2fd' : 'inherit',
                '&:hover': { boxShadow: 2 },
              }}
            >
              <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                <Typography variant="body2" noWrap>
                  {issue.jira_key}
                </Typography>
                <Typography variant="caption" color="textSecondary" noWrap>
                  {issue.title}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Grid>

      {/* Estimation Area */}
      <Grid item xs={12} md={8}>
        {selectedIssue ? (
          <EstimationCard issue={selectedIssue} session={session} />
        ) : (
          <Typography color="textSecondary">
            Select an issue to start estimating
          </Typography>
        )}
      </Grid>
    </Grid>
  );
}

export default SessionBoard;
