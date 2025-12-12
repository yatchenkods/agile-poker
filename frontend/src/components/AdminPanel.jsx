import React from 'react';
import { Box, Card, CardContent, Typography, Button, Alert } from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import { useNavigate } from 'react-router-dom';

function AdminPanel() {
  const navigate = useNavigate();

  return (
    <Box sx={{ p: 3 }}>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <SecurityIcon sx={{ fontSize: 32, color: 'primary.main' }} />
            <Typography variant="h5" sx={{ mb: 0 }}>
              👨‍💼 Admin Panel
            </Typography>
          </Box>
          
          <Alert severity="info" sx={{ mb: 2 }}>
            The user management and system administration features have been consolidated into the main Admin section.
          </Alert>

          <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
            Click the button below to access the full admin panel with:
          </Typography>

          <Box component="ul" sx={{ mb: 3 }}>
            <li>User management (create, reset password, delete, toggle status)</li>
            <li>System statistics and overview</li>
            <li>Issue management and tracking</li>
            <li>Conflicting estimates analysis</li>
          </Box>

          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/admin')}
            startIcon={<SecurityIcon />}
          >
            Go to Full Admin Panel
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}

export default AdminPanel;
