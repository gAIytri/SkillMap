import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Alert,
  Divider,
  Link,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { colorPalette } from '../styles/theme';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(formData);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to login. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async (credentialResponse) => {
    try {
      setLoading(true);
      setError('');

      // Use googleLogin from AuthContext - it handles everything!
      await googleLogin(credentialResponse.credential);

      toast.success('Successfully logged in with Google!');
      navigate('/dashboard');
    } catch (err) {
      console.error('Google login error:', err);
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to login with Google. Please try again.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    toast.error('Google login was cancelled or failed.');
  };

  return (
    <Container maxWidth="sm">
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="calc(100vh - 64px)"
        py={4}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            width: '100%',
            borderRadius: 3,
          }}
        >
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            textAlign="center"
            fontWeight={700}
            color={colorPalette.primary.darkGreen}
          >
            Welcome Back
          </Typography>
          <Typography
            variant="body2"
            textAlign="center"
            color="text.secondary"
            mb={3}
          >
            Login to continue tailoring your resumes
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              margin="normal"
              required
              autoComplete="email"
              autoFocus
            />
            <TextField
              fullWidth
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              margin="normal"
              required
              autoComplete="current-password"
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{
                mt: 3,
                mb: 2,
                py: 1.5,
                bgcolor: colorPalette.primary.brightGreen,
                '&:hover': {
                  bgcolor: colorPalette.secondary.mediumGreen,
                },
              }}
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>

          <Divider sx={{ my: 2 }}>OR</Divider>

          <Box display="flex" justifyContent="center" width="100%">
            <GoogleLogin
              onSuccess={handleGoogleLogin}
              onError={handleGoogleError}
              useOneTap
              theme="outline"
              size="large"
              text="continue_with"
              width="100%"
            />
          </Box>

          <Box textAlign="center" mt={3}>
            <Typography variant="body2" color="text.secondary">
              Don't have an account?{' '}
              <Link
                component="button"
                variant="body2"
                onClick={() => navigate('/register')}
                sx={{
                  color: colorPalette.primary.brightGreen,
                  textDecoration: 'none',
                  fontWeight: 600,
                  cursor: 'pointer',
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
              >
                Sign Up
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;
