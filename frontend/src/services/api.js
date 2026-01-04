import axios from 'axios';
import { config } from '../config.ts';

// Use runtime config that supports environment variable override
const API_URL = config.apiUrl;

const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
});

// Log API configuration in debug mode
if (config.logLevel === 'debug' || config.logLevel === 'trace') {
  console.log('[API] Initialized with base URL:', api.defaults.baseURL);
}

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const isAuthenticated = () => !!localStorage.getItem('token');

export const logout = () => {
  localStorage.removeItem('token');
};

export { api };
