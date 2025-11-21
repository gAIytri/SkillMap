import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Paper,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAdmin } from '../context/AdminContext';
import adminAuthService from '../services/adminAuthService';
import { colorPalette } from '../styles/theme';
import LogoutIcon from '@mui/icons-material/Logout';

// Import components
import AdminSidebar from '../components/admin/AdminSidebar';
import DateRangeSelector from '../components/admin/DateRangeSelector';
import OverviewSection from '../components/admin/OverviewSection';
import UsersDetailedView from '../components/admin/UsersDetailedView';
import CreditsDetailedView from '../components/admin/CreditsDetailedView';
import TokensDetailedView from '../components/admin/TokensDetailedView';
import RetentionAnalytics from '../components/admin/RetentionAnalytics';

const AdminDashboard = () => {
  const { admin, logout } = useAdmin();
  const navigate = useNavigate();

  const [selectedTab, setSelectedTab] = useState('overview');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState({ preset: '30d' });

  // Analytics data
  const [userAnalytics, setUserAnalytics] = useState(null);
  const [tokenAnalytics, setTokenAnalytics] = useState(null);
  const [creditsAnalytics, setCreditsAnalytics] = useState(null);
  const [retentionAnalytics, setRetentionAnalytics] = useState(null);

  // Fetch all analytics data
  const fetchAnalytics = async (params) => {
    setLoading(true);
    setError('');

    try {
      // Fetch all analytics in parallel
      const [userData, tokenData, creditsData, retentionData] = await Promise.all([
        adminAuthService.getUserAnalytics(params),
        adminAuthService.getTokenAnalytics(params),
        adminAuthService.getCreditsAnalytics(params),
        adminAuthService.getRetentionAnalytics(params),
      ]);

      setUserAnalytics(userData);
      setTokenAnalytics(tokenData);
      setCreditsAnalytics(creditsData);
      setRetentionAnalytics(retentionData);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      const errorMsg = err.response?.data?.detail || 'Failed to load analytics';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Load initial data
  useEffect(() => {
    fetchAnalytics(dateRange);
  }, []);

  // Handle date range change (only for Overview tab)
  const handleDateRangeChange = (newRange) => {
    setDateRange(newRange);
    fetchAnalytics(newRange);
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    toast.success('Admin logged out successfully');
    navigate('/admin/login');
  };

  // Handle drawer toggle (mobile)
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // Render content based on selected tab
  const renderContent = () => {
    if (loading && selectedTab === 'overview') {
      return (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress size={60} sx={{ color: colorPalette.primary.brightGreen }} />
        </Box>
      );
    }

    switch (selectedTab) {
      case 'overview':
        return (
          <OverviewSection
            userAnalytics={userAnalytics}
            tokenAnalytics={tokenAnalytics}
            creditsAnalytics={creditsAnalytics}
          />
        );
      case 'users':
        return <UsersDetailedView />;
      case 'credits':
        return <CreditsDetailedView />;
      case 'tokens':
        return <TokensDetailedView />;
      case 'retention':
        return (
          <Box>
            <RetentionAnalytics data={retentionAnalytics} />
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      {/* Sidebar */}
      <AdminSidebar
        selectedTab={selectedTab}
        onTabChange={setSelectedTab}
        mobileOpen={mobileOpen}
        onDrawerToggle={handleDrawerToggle}
      />

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3, md: 4 },
          width: { md: `calc(100% - 240px)` },
          mt: { xs: 7, md: 0 }, // Add top margin on mobile for menu button
        }}
      >
        {/* Header */}
        <Paper elevation={3} sx={{ p: { xs: 2, md: 3 }, mb: { xs: 2, md: 4 } }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
            <Box>
              <Typography variant="h4" fontWeight={700} color={colorPalette.primary.darkGreen} sx={{ fontSize: { xs: '1.5rem', md: '2.125rem' } }}>
                {selectedTab.charAt(0).toUpperCase() + selectedTab.slice(1)}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                Welcome, {admin?.full_name || 'Admin'}
              </Typography>
            </Box>

            <Button
              variant="outlined"
              color="error"
              startIcon={<LogoutIcon sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }} />}
              onClick={handleLogout}
              size="small"
              sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' }, py: { xs: 0.5, md: 0.75 }, px: { xs: 1.5, md: 2 } }}
            >
              Logout
            </Button>
          </Box>
        </Paper>

        {/* Date Range Selector (only for Overview) */}
        {selectedTab === 'overview' && (
          <DateRangeSelector onRangeChange={handleDateRangeChange} />
        )}

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Content */}
        {renderContent()}
      </Box>
    </Box>
  );
};

export default AdminDashboard;
