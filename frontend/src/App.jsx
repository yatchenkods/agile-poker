import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Container, AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import HomeIcon from '@mui/icons-material/Home';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

import Login from './pages/Login';
import Home from './pages/Home';
import SessionDetail from './pages/SessionDetail';
import Admin from './pages/Admin';
import { api, isAuthenticated, logout } from './services/api';

function App() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(isAuthenticated());
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoggedIn) {
      // Fetch current user
      api.get('/auth/me')
        .then(res => {
          console.log('User loaded:', res.data);
          setCurrentUser(res.data);
        })
        .catch(err => {
          console.error('Failed to load user:', err);
          setIsLoggedIn(false);
          logout();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [isLoggedIn]);

  const handleLogout = () => {
    logout();
    setIsLoggedIn(false);
    setCurrentUser(null);
  };

  const handleLogoClick = () => {
    navigate('/');
  };

  const handleAdminClick = () => {
    console.log('Admin button clicked, is_admin:', currentUser?.is_admin);
    navigate('/admin');
  };

  return (
    <>
      {isLoggedIn && (
        <AppBar position="sticky">
          <Toolbar>
            {/* Clickable Logo */}
            <Box
              onClick={handleLogoClick}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                cursor: 'pointer',
                '&:hover': {
                  opacity: 0.8,
                },
                transition: 'opacity 0.2s',
                flexGrow: 1,
              }}
            >
              <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                🎲 Agile Planning Poker
              </Typography>
            </Box>

            {/* User Info */}
            {currentUser && (
              <Box sx={{ mr: 2 }}>
                <Typography variant="body2">
                  {currentUser.full_name}
                </Typography>
              </Box>
            )}

            {/* Home Button */}
            <Button
              color="inherit"
              onClick={handleLogoClick}
              startIcon={<HomeIcon />}
              sx={{ mr: 1 }}
            >
              Home
            </Button>

            {/* Admin Button */}
            {currentUser && currentUser.is_admin && (
              <Button
                color="inherit"
                onClick={handleAdminClick}
                startIcon={<AdminPanelSettingsIcon />}
                sx={{ mr: 1 }}
              >
                Admin
              </Button>
            )}

            {/* Logout Button */}
            <Button color="inherit" onClick={handleLogout} startIcon={<LogoutIcon />}>
              Logout
            </Button>
          </Toolbar>
        </AppBar>
      )}

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Routes>
          <Route path="/login" element={<Login onLogin={() => setIsLoggedIn(true)} />} />
          <Route path="/" element={isLoggedIn ? <Home /> : <Navigate to="/login" />} />
          <Route path="/session/:sessionId" element={isLoggedIn ? <SessionDetail /> : <Navigate to="/login" />} />
          {/* Admin route - Admin component handles access check */}
          <Route path="/admin" element={isLoggedIn ? <Admin /> : <Navigate to="/login" />} />
        </Routes>
      </Container>
    </>
  );
}

export default App;
