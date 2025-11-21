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
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';
import { colorPalette } from '../styles/theme';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

const AdminLogin = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAdmin();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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
      toast.success('Admin login successful!');
      navigate('/admin/dashboard');
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to login. Please check your credentials.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        py={isMobile ? 2 : 4}
        px={isMobile ? 2 : 0}
      >
        <Paper
          elevation={3}
          sx={{
            p: isMobile ? 3 : 5,
            width: '100%',
            borderRadius: 3,
            border: `2px solid ${colorPalette.primary.darkGreen}`,
          }}
        >
          {/* Admin Icon */}
          <Box display="flex" justifyContent="center" mb={2}>
            <AdminPanelSettingsIcon
              sx={{
                fontSize: 64,
                color: colorPalette.primary.darkGreen,
              }}
            />
          </Box>

          <Typography
            variant={isMobile ? 'h5' : 'h4'}
            component="h1"
            gutterBottom
            textAlign="center"
            fontWeight={700}
            color={colorPalette.primary.darkGreen}
          >
            Admin Portal
          </Typography>
          <Typography
            variant="body2"
            textAlign="center"
            color="text.secondary"
            mb={4}
          >
            Authorized access only
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Admin Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              margin="normal"
              required
              autoComplete="email"
              autoFocus
              sx={{ mb: 2 }}
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
              sx={{ mb: 3 }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{
                py: 1.5,
                bgcolor: colorPalette.primary.darkGreen,
                '&:hover': {
                  bgcolor: colorPalette.secondary.mediumGreen,
                },
                fontWeight: 600,
              }}
            >
              {loading ? 'Logging in...' : 'Admin Login'}
            </Button>
          </form>
        </Paper>
      </Box>
    </Container>
  );
};

export default AdminLogin;
