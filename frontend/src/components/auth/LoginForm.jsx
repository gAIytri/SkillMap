import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Alert,
  Divider,
  Link,
  IconButton,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { colorPalette } from '../../styles/theme';

const LoginForm = ({ onBack, onSwitchToSignup }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const validateEmail = (email) => {
    // Regex that requires:
    // - @ symbol
    // - At least 2 alphabetic characters after the dot (TLD)
    // - No numbers allowed in TLD
    const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value,
    });

    // Validate email on change
    if (name === 'email') {
      if (value && !validateEmail(value)) {
        setEmailError('Invalid email');
      } else {
        setEmailError('');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate email before submitting
    if (!validateEmail(formData.email)) {
      setEmailError('Invalid email');
      setLoading(false);
      return;
    }

    try {
      const response = await login(formData);

      if (response && response.user) {
        // Check if email is verified
        if (!response.user.email_verified) {
          // User is not verified - redirect to verification page
          toast('Please verify your email to continue. A new verification code has been sent.', {
            icon: '📧',
            duration: 5000,
          });
          navigate('/verify-email', { state: { email: formData.email } });
        } else if (!response.user.base_resume_id) {
          // User is verified but no base resume - go to upload
          toast.success('Welcome back!');
          navigate('/upload-resume');
        } else {
          // User is verified and has base resume - go to dashboard
          toast.success('Welcome back!');
          navigate('/dashboard');
        }
      } else {
        console.error('Unexpected response format:', response);
        setError('Unexpected response from server. Please try again.');
      }
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
      await googleLogin(credentialResponse.credential);
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
    <Box
      sx={{
        width: '100%',
        maxWidth: '500px',
        mx: 'auto',
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: isMobile ? 3 : 4,
          borderRadius: 3,
          position: 'relative',
        }}
      >
        {/* Back Button */}
        <IconButton
          onClick={onBack}
          sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            color: colorPalette.primary.darkGreen,
          }}
        >
          <ArrowBackIcon />
        </IconButton>

        <Typography
          variant={isMobile ? 'h5' : 'h4'}
          component="h1"
          gutterBottom
          textAlign="center"
          fontWeight={700}
          color={colorPalette.primary.darkGreen}
          sx={{ mt: isMobile ? 2 : 1 }}
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
            type="text"
            value={formData.email}
            onChange={handleChange}
            margin="normal"
            required
            autoComplete="email"
            autoFocus
            error={!!emailError}
            helperText={emailError}
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
              onClick={onSwitchToSignup}
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
  );
};

export default LoginForm;
