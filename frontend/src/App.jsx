import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Container, AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';

import Login from './pages/Login';
import Home from './pages/Home';
import SessionDetail from './pages/SessionDetail';
import Admin from './pages/Admin';
import { api, isAuthenticated, logout } from './services/api';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(isAuthenticated());
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    if (isLoggedIn) {
      // Fetch current user
      api.get('/auth/me')
        .then(res => setCurrentUser(res.data))
        .catch(() => {
          setIsLoggedIn(false);
          logout();
        });
    }
  }, [isLoggedIn]);

  const handleLogout = () => {
    logout();
    setIsLoggedIn(false);
    setCurrentUser(null);
  };

  return (
    <>
      {isLoggedIn && (
        <AppBar position="sticky">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              🎲 Agile Planning Poker
            </Typography>
            {currentUser && (
              <Box sx={{ mr: 2 }}>
                <Typography variant="body2">
                  {currentUser.full_name}
                </Typography>
              </Box>
            )}
            {currentUser?.is_admin && (
              <Button color="inherit" href="/admin" sx={{ mr: 1 }}>
                Admin
              </Button>
            )}
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
          <Route path="/admin" element={isLoggedIn && currentUser?.is_admin ? <Admin /> : <Navigate to="/" />} />
        </Routes>
      </Container>
    </>
  );
}

export default App;
