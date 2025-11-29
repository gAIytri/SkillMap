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

const SignupForm = ({ onBack, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const { register, googleLogin } = useAuth();
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

    // Validate password on change
    if (name === 'password') {
      if (value && value.length < 8) {
        setPasswordError('Password must be at least 8 characters long');
      } else {
        setPasswordError('');
      }

      // Also check confirm password match if it's filled
      if (formData.confirmPassword && value !== formData.confirmPassword) {
        setConfirmPasswordError('Passwords do not match');
      } else {
        setConfirmPasswordError('');
      }
    }

    // Validate confirm password on change
    if (name === 'confirmPassword') {
      if (value && value !== formData.password) {
        setConfirmPasswordError('Passwords do not match');
      } else {
        setConfirmPasswordError('');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate email
    if (!validateEmail(formData.email)) {
      setEmailError('Invalid email');
      return;
    }

    // Validate password
    if (formData.password.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
      return;
    }

    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await register({
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
      });
      toast.success('Account created! Check your email for verification code.');
      // Navigate to verification page with email
      navigate('/verify-email', { state: { email: formData.email } });
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async (credentialResponse) => {
    try {
      setLoading(true);
      setError('');
      await googleLogin(credentialResponse.credential);
      navigate('/upload-resume');
    } catch (err) {
      console.error('Google signup error:', err);
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to sign up with Google. Please try again.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    toast.error('Google sign up was cancelled or failed.');
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
          Create Account
        </Typography>
        <Typography
          variant="body2"
          textAlign="center"
          color="text.secondary"
          mb={3}
        >
          Start tailoring your resume for every job
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Full Name"
            name="full_name"
            value={formData.full_name}
            onChange={handleChange}
            margin="normal"
            required
            autoFocus
          />
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
            autoComplete="new-password"
            error={!!passwordError}
            helperText={passwordError || "Minimum 8 characters"}
          />
          <TextField
            fullWidth
            label="Confirm Password"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            margin="normal"
            required
            autoComplete="new-password"
            error={!!confirmPasswordError}
            helperText={confirmPasswordError}
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
            {loading ? 'Creating Account...' : 'Sign Up'}
          </Button>
        </form>

        <Divider sx={{ my: 2 }}>OR</Divider>

        <Box display="flex" justifyContent="center" width="100%">
          <GoogleLogin
            onSuccess={handleGoogleSignup}
            onError={handleGoogleError}
            useOneTap
            theme="outline"
            size="large"
            text="signup_with"
            width="100%"
          />
        </Box>

        <Box textAlign="center" mt={3}>
          <Typography variant="body2" color="text.secondary">
            Already have an account?{' '}
            <Link
              component="button"
              variant="body2"
              onClick={onSwitchToLogin}
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
              Login
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default SignupForm;
