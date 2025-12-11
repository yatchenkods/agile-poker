import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
} from '@mui/material';

import { api } from '../services/api';

function Login({ onLogin }) {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // Login - use FormData for OAuth2 password flow
        const formData = new FormData();
        formData.append('username', email);
        formData.append('password', password);

        const res = await api.post('/auth/login', formData, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        });
        localStorage.setItem('token', res.data.access_token);
        localStorage.setItem('user', JSON.stringify(res.data));
        onLogin();
        navigate('/');
      } else {
        // Register
        const registerRes = await api.post('/auth/register', {
          email,
          password,
          full_name: fullName,
        });

        // Auto-login after registration
        const formData = new FormData();
        formData.append('username', email);
        formData.append('password', password);

        const loginRes = await api.post('/auth/login', formData, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        });

        localStorage.setItem('token', loginRes.data.access_token);
        localStorage.setItem('user', JSON.stringify(loginRes.data));
        onLogin();
        navigate('/');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 
                          err.response?.data?.message || 
                          err.message ||
                          'An error occurred';
      setError(errorMessage);
      console.error('Auth error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <Card sx={{ p: 4, width: '100%', maxWidth: 400 }}>
          <Typography variant="h4" gutterBottom textAlign="center">
            🎲 Agile Poker
          </Typography>
          <Typography
            variant="body2"
            color="textSecondary"
            gutterBottom
            textAlign="center"
            sx={{ mb: 3 }}
          >
            {isLogin ? 'Sign in to your account' : 'Create a new account'}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <TextField
                label="Full Name"
                fullWidth
                margin="normal"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required={!isLogin}
              />
            )}
            <TextField
              label="Email"
              type="email"
              fullWidth
              margin="normal"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
            <TextField
              label="Password"
              type="password"
              fullWidth
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3 }}
              disabled={loading}
            >
              {loading ? 'Loading...' : isLogin ? 'Sign In' : 'Sign Up'}
            </Button>
          </form>

          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Typography variant="body2">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <Button
                size="small"
                onClick={() => setIsLogin(!isLogin)}
                sx={{ textTransform: 'none' }}
                disabled={loading}
              >
                {isLogin ? 'Sign Up' : 'Sign In'}
              </Button>
            </Typography>
          </Box>

          {isLogin && (
            <Box sx={{ mt: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="caption" color="textSecondary">
                Demo credentials:
                <br />
                Email: admin@company.com
                <br />
                Password: SecurePass123
              </Typography>
            </Box>
          )}
        </Card>
      </Box>
    </Container>
  );
}

export default Login;
