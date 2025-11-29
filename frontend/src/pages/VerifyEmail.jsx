import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  Link,
  CircularProgress,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { colorPalette } from '../styles/theme';

const VerifyEmail = () => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [canResend, setCanResend] = useState(true);
  const [resendCooldown, setResendCooldown] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useParams(); // Magic link token from URL
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Get email from location state (passed from register)
  const email = location.state?.email || '';

  // Refs for input fields
  const inputRefs = useRef([]);

  // Handle magic link verification on mount
  useEffect(() => {
    if (token) {
      verifyWithMagicLink();
    }
  }, [token]);

  // Handle resend cooldown
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendCooldown]);

  const verifyWithMagicLink = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/auth/verify-email/${token}`);

      // Just update the user object in localStorage - keep the same token
      const existingUser = JSON.parse(localStorage.getItem('user') || '{}');
      const updatedUser = {
        ...existingUser,
        ...response.data.user,
        email_verified: true, // CRITICAL: Mark as verified
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      toast.success('Email verified successfully! 🎉');

      // Force page reload to refresh AuthContext
      window.location.href = updatedUser.base_resume_id ? '/dashboard' : '/upload-resume';
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Verification failed. Please try with the code.';
      setError(errorMsg);
      toast.error(errorMsg);
      setLoading(false);
    }
  };

  const handleCodeChange = (index, value) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all 6 digits entered
    if (newCode.every(digit => digit !== '') && index === 5) {
      verifyCode(newCode.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    // Handle paste
    if (e.key === 'v' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      navigator.clipboard.readText().then(text => {
        const digits = text.replace(/\D/g, '').slice(0, 6).split('');
        const newCode = [...code];
        digits.forEach((digit, i) => {
          if (i < 6) newCode[i] = digit;
        });
        setCode(newCode);
        if (digits.length === 6) {
          verifyCode(newCode.join(''));
        }
      });
    }
  };

  const verifyCode = async (codeString) => {
    if (!email) {
      toast.error('Email not found. Please sign up again.');
      navigate('/');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/api/auth/verify-email', {
        email,
        code: codeString,
      });

      // Just update the user object in localStorage - keep the same token
      const existingUser = JSON.parse(localStorage.getItem('user') || '{}');
      const updatedUser = {
        ...existingUser,
        ...response.data.user,
        email_verified: true, // CRITICAL: Mark as verified
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      toast.success('Email verified successfully! 🎉');

      // Force page reload to refresh AuthContext
      window.location.href = updatedUser.base_resume_id ? '/dashboard' : '/upload-resume';
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Invalid or expired code. Please try again.';
      setError(errorMsg);
      toast.error(errorMsg);
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!canResend || !email) return;

    setResending(true);
    setError('');

    try {
      await api.post('/api/auth/resend-verification', { email });
      toast.success('Verification code sent! Check your email.');
      setCanResend(false);
      setResendCooldown(60); // 60 seconds cooldown
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to resend code. Please try again.';
      toast.error(errorMsg);
    } finally {
      setResending(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="calc(100vh - 64px)"
        py={isMobile ? 2 : 4}
        px={isMobile ? 2 : 0}
      >
        <Paper
          elevation={3}
          sx={{
            p: isMobile ? 3 : 4,
            width: '100%',
            borderRadius: 3,
            textAlign: 'center',
          }}
        >
          {/* Icon */}
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${colorPalette.primary.darkGreen}, ${colorPalette.primary.brightGreen})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px auto',
            }}
          >
            <MarkEmailReadIcon sx={{ fontSize: 40, color: '#FFFFFF' }} />
          </Box>

          <Typography
            variant={isMobile ? 'h5' : 'h4'}
            component="h1"
            gutterBottom
            fontWeight={700}
            color={colorPalette.primary.darkGreen}
          >
            Verify Your Email
          </Typography>

          <Typography variant="body2" color="text.secondary" mb={3}>
            We've sent a 6-digit code to <strong>{email}</strong>
            <br />
            Enter the code below or click the link in your email.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2, textAlign: 'left' }}>
              {error}
            </Alert>
          )}

          {/* 6-digit code inputs */}
          <Box
            sx={{
              display: 'flex',
              gap: isMobile ? 1 : 1.5,
              justifyContent: 'center',
              mb: 3,
            }}
          >
            {code.map((digit, index) => (
              <TextField
                key={index}
                inputRef={(el) => (inputRefs.current[index] = el)}
                value={digit}
                onChange={(e) => handleCodeChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                disabled={loading}
                inputProps={{
                  maxLength: 1,
                  style: {
                    textAlign: 'center',
                    fontSize: isMobile ? '20px' : '24px',
                    fontWeight: 700,
                    padding: isMobile ? '12px 0' : '16px 0',
                  },
                }}
                sx={{
                  width: isMobile ? '40px' : '50px',
                  '& .MuiOutlinedInput-root': {
                    '&.Mui-focused fieldset': {
                      borderColor: colorPalette.primary.brightGreen,
                      borderWidth: 2,
                    },
                  },
                }}
              />
            ))}
          </Box>

          {/* Verify button */}
          <Button
            fullWidth
            variant="contained"
            size="large"
            disabled={loading || code.some(d => d === '')}
            onClick={() => verifyCode(code.join(''))}
            sx={{
              mb: 2,
              py: 1.5,
              bgcolor: colorPalette.primary.brightGreen,
              '&:hover': {
                bgcolor: colorPalette.secondary.mediumGreen,
              },
            }}
          >
            {loading ? (
              <CircularProgress size={24} sx={{ color: '#FFFFFF' }} />
            ) : (
              'Verify Email'
            )}
          </Button>

          {/* Resend code */}
          <Typography variant="body2" color="text.secondary" mb={2}>
            Didn't receive the code?{' '}
            <Link
              component="button"
              variant="body2"
              disabled={!canResend || resending}
              onClick={handleResendCode}
              sx={{
                color: canResend ? colorPalette.primary.brightGreen : '#CCCCCC',
                textDecoration: 'none',
                fontWeight: 600,
                cursor: canResend ? 'pointer' : 'not-allowed',
                '&:hover': {
                  textDecoration: canResend ? 'underline' : 'none',
                },
              }}
            >
              {resending
                ? 'Sending...'
                : resendCooldown > 0
                ? `Resend in ${resendCooldown}s`
                : 'Resend Code'}
            </Link>
          </Typography>

          {/* Check spam notice */}
          <Alert severity="info" sx={{ textAlign: 'left' }}>
            <Typography variant="caption">
              <strong>Note:</strong> Check your spam/junk folder if you don't see the email within 2
              minutes.
            </Typography>
          </Alert>

          {/* Back to login */}
          <Box textAlign="center" mt={3}>
            <Typography variant="body2" color="text.secondary">
              Wrong email?{' '}
              <Link
                component="button"
                variant="body2"
                onClick={() => navigate('/')}
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
                Go Back
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default VerifyEmail;
