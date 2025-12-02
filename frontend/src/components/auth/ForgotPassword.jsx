import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Alert,
  IconButton,
  useTheme,
  useMediaQuery,
  InputAdornment,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { colorPalette } from '../../styles/theme';

const ForgotPassword = ({ onBack }) => {
  const [step, setStep] = useState(1); // 1: email, 2: code, 3: new password
  const [formData, setFormData] = useState({
    email: '',
    code: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    if (name === 'email') {
      if (value && !validateEmail(value)) {
        setEmailError('Invalid email');
      } else {
        setEmailError('');
      }
    }
  };

  const handleSendCode = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!validateEmail(formData.email)) {
      setEmailError('Invalid email');
      setLoading(false);
      return;
    }

    try {
      await api.post('/api/auth/forgot-password', { email: formData.email });
      toast.success('Password reset code sent to your email!');
      setStep(2); // Move to code entry step
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send reset code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.code || formData.code.length !== 6) {
      setError('Please enter a valid 6-digit code');
      setLoading(false);
      return;
    }

    try {
      await api.post('/api/auth/verify-reset-code', {
        email: formData.email,
        code: formData.code,
      });
      toast.success('Code verified! Please enter your new password.');
      setStep(3); // Move to password entry step
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid or expired code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate passwords
    if (formData.newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      await api.post('/api/auth/reset-password', {
        email: formData.email,
        code: formData.code,
        new_password: formData.newPassword,
      });
      toast.success('Password reset successfully! Please login with your new password.');
      navigate('/', { state: { showLogin: true } });
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper
      elevation={3}
      sx={{
        p: { xs: 3, sm: 4 },
        borderRadius: 2,
        maxWidth: 450,
        width: '100%',
        margin: '0 auto',
        background: `linear-gradient(to bottom, ${colorPalette.white}, ${colorPalette.lightGreen})`,
      }}
    >
      {/* Back Button */}
      <IconButton
        onClick={onBack}
        sx={{
          mb: 2,
          color: colorPalette.darkGreen,
          '&:hover': {
            backgroundColor: colorPalette.lightGreen,
          },
        }}
      >
        <ArrowBackIcon />
      </IconButton>

      <Typography
        variant="h5"
        gutterBottom
        sx={{
          fontWeight: 700,
          color: colorPalette.darkGreen,
          mb: 3,
          textAlign: 'center',
        }}
      >
        Reset Password
      </Typography>

      {/* Step 1: Enter Email */}
      {step === 1 && (
        <Box component="form" onSubmit={handleSendCode}>
          <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary', textAlign: 'center' }}>
            Enter your email address and we'll send you a verification code to reset your password.
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <TextField
            fullWidth
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
            error={!!emailError}
            helperText={emailError}
            sx={{ mb: 3 }}
          />

          <Button
            fullWidth
            type="submit"
            variant="contained"
            disabled={loading || !!emailError}
            sx={{
              py: 1.5,
              background: `linear-gradient(135deg, ${colorPalette.darkGreen}, ${colorPalette.brightGreen})`,
              color: 'white',
              fontWeight: 600,
              '&:hover': {
                background: `linear-gradient(135deg, ${colorPalette.brightGreen}, ${colorPalette.darkGreen})`,
              },
            }}
          >
            {loading ? 'Sending...' : 'Send Reset Code'}
          </Button>
        </Box>
      )}

      {/* Step 2: Enter Verification Code */}
      {step === 2 && (
        <Box component="form" onSubmit={handleVerifyCode}>
          <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary', textAlign: 'center' }}>
            We've sent a 6-digit verification code to <strong>{formData.email}</strong>. Please enter it below.
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <TextField
            fullWidth
            label="Verification Code"
            name="code"
            value={formData.code}
            onChange={handleChange}
            required
            inputProps={{ maxLength: 6 }}
            sx={{ mb: 3 }}
            placeholder="123456"
          />

          <Button
            fullWidth
            type="submit"
            variant="contained"
            disabled={loading || formData.code.length !== 6}
            sx={{
              py: 1.5,
              background: `linear-gradient(135deg, ${colorPalette.darkGreen}, ${colorPalette.brightGreen})`,
              color: 'white',
              fontWeight: 600,
              '&:hover': {
                background: `linear-gradient(135deg, ${colorPalette.brightGreen}, ${colorPalette.darkGreen})`,
              },
            }}
          >
            {loading ? 'Verifying...' : 'Verify Code'}
          </Button>

          <Button
            fullWidth
            variant="text"
            onClick={() => {
              setStep(1);
              setError('');
              setFormData({ ...formData, code: '' });
            }}
            sx={{ mt: 2, color: colorPalette.darkGreen }}
          >
            Resend Code
          </Button>
        </Box>
      )}

      {/* Step 3: Enter New Password */}
      {step === 3 && (
        <Box component="form" onSubmit={handleResetPassword}>
          <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary', textAlign: 'center' }}>
            Enter your new password below.
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <TextField
            fullWidth
            label="New Password"
            name="newPassword"
            type={showPassword ? 'text' : 'password'}
            value={formData.newPassword}
            onChange={handleChange}
            required
            sx={{ mb: 2 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <TextField
            fullWidth
            label="Confirm Password"
            name="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            sx={{ mb: 3 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    edge="end"
                  >
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Button
            fullWidth
            type="submit"
            variant="contained"
            disabled={loading || !formData.newPassword || !formData.confirmPassword}
            sx={{
              py: 1.5,
              background: `linear-gradient(135deg, ${colorPalette.darkGreen}, ${colorPalette.brightGreen})`,
              color: 'white',
              fontWeight: 600,
              '&:hover': {
                background: `linear-gradient(135deg, ${colorPalette.brightGreen}, ${colorPalette.darkGreen})`,
              },
            }}
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </Button>
        </Box>
      )}
    </Paper>
  );
};

export default ForgotPassword;
