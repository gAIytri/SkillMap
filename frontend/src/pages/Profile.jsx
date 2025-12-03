import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  Avatar,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Grid,
  Drawer,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import DashboardIcon from '@mui/icons-material/Dashboard';
import HistoryIcon from '@mui/icons-material/History';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import SettingsIcon from '@mui/icons-material/Settings';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import creditsService from '../services/creditsService';
import projectService from '../services/projectService';
import userService from '../services/userService';
import { colorPalette } from '../styles/theme';
import DashboardTab from '../components/profile/DashboardTab';
import TransactionsTab from '../components/profile/TransactionsTab';
import RechargeTab from '../components/profile/RechargeTab';
import SettingsTab from '../components/profile/SettingsTab';

const Profile = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, refreshUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTailors: 0,
    totalCreditsUsed: 0,
    totalCreditsPurchased: 0,
    totalProjects: 0,
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [rechargeLoading, setRechargeLoading] = useState(false);
  const [autoRecharge, setAutoRecharge] = useState(false);
  const [showBetaModal, setShowBetaModal] = useState(false);

  // Settings tab states
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const hasShownToast = useRef(false);
  const isMounted = useRef(true);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Credit packages with auto-recharge bonuses
  const creditPackages = [
    {
      credits: 50,
      price: 5.00,
      savings: null,
      autoBonus: 20,
      popular: false,
      perCredit: 0.10,
      tailorings: '8-12',
    },
    {
      credits: 100,
      price: 9.00,
      savings: 10,
      autoBonus: 20,
      popular: true,
      perCredit: 0.09,
      tailorings: '16-25',
    },
    {
      credits: 250,
      price: 20.00,
      savings: 20,
      autoBonus: 20,
      popular: false,
      perCredit: 0.08,
      tailorings: '41-62',
    },
    {
      credits: 500,
      price: 35.00,
      savings: 30,
      autoBonus: 20,
      popular: false,
      perCredit: 0.07,
      tailorings: '83-125',
    },
  ];

  // Load transactions
  const loadTransactions = useCallback(async () => {
    try {
      const data = await creditsService.getTransactions(50, 0);
      if (isMounted.current) {
        setTransactions(data);
      }
    } catch (error) {
      console.error('Failed to load transactions:', error);
      if (isMounted.current) {
        toast.error('Failed to load transaction history');
      }
    }
  }, []);

  // Load stats
  const loadStats = useCallback(async () => {
    try {
      // Load transactions for stats
      const transactionsData = await creditsService.getTransactions(1000, 0);

      // Calculate stats with case-insensitive comparison
      const tailorTransactions = transactionsData.filter(t => t.transaction_type?.toLowerCase() === 'tailor');
      const creditsUsed = tailorTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const creditsPurchased = transactionsData
        .filter(t => t.transaction_type?.toLowerCase() === 'purchase')
        .reduce((sum, t) => sum + t.amount, 0);

      // Load projects count
      const projectsData = await projectService.getAllProjects();

      if (isMounted.current) {
        setStats({
          totalTailors: tailorTransactions.length, // Count actual tailor transactions
          totalCreditsUsed: creditsUsed,
          totalCreditsPurchased: creditsPurchased,
          totalProjects: projectsData.length,
        });
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, []);

  // Load initial data
  useEffect(() => {
    isMounted.current = true;

    const loadData = async () => {
      setLoading(true);
      if (refreshUser) {
        await refreshUser();
      }
      if (isMounted.current) {
        await Promise.all([loadTransactions(), loadStats()]);
        setLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Handle payment redirect
  useEffect(() => {
    const payment = searchParams.get('payment');

    if (payment && !hasShownToast.current) {
      hasShownToast.current = true;

      if (payment === 'success') {
        toast.success('Payment successful! Your credits have been added.', { duration: 5000 });
        if (refreshUser) {
          refreshUser();
        }
        loadTransactions();
        loadStats();
      } else if (payment === 'cancelled') {
        toast.error('Payment was cancelled.', { duration: 4000 });
      }

      setTimeout(() => {
        if (isMounted.current) {
          window.history.replaceState({}, '', '/profile');
        }
      }, 100);
    }
  }, [searchParams, refreshUser, loadTransactions, loadStats]);

  // Export transactions to CSV
  const exportTransactionsCSV = () => {
    if (transactions.length === 0) {
      toast.error('No transactions to export');
      return;
    }

    // CSV headers
    const headers = ['Date', 'Type', 'Project', 'Amount', 'Balance After'];

    // CSV rows
    const rows = transactions.map(t => [
      formatDate(t.created_at),
      t.transaction_type,
      t.transaction_type?.toLowerCase() === 'tailor' ? (t.project_name || 'N/A') : 'N/A',
      t.amount.toFixed(2),
      t.balance_after.toFixed(2)
    ]);

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `skillmap-transactions-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Transactions exported successfully!');
  };

  // Edit profile name
  const handleEditName = () => {
    setNewName(user?.full_name || '');
    setEditingName(true);
  };

  const handleSaveName = async () => {
    if (!newName || newName.trim().length === 0) {
      toast.error('Name cannot be empty');
      return;
    }

    setSavingName(true);
    try {
      await userService.updateProfile({ full_name: newName.trim() });
      await refreshUser();
      setEditingName(false);
      toast.success('Name updated successfully!');
    } catch (error) {
      console.error('Failed to update name:', error);
      toast.error('Failed to update name. Please try again.');
    } finally {
      setSavingName(false);
    }
  };

  const handleCancelEditName = () => {
    setEditingName(false);
    setNewName('');
  };

  // Delete account
  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await userService.deleteAccount();
      toast.success('Account deleted successfully');
      // Logout (clears localStorage and AuthContext state) and redirect
      logout();
      navigate('/');
    } catch (error) {
      console.error('Failed to delete account:', error);
      toast.error('Failed to delete account. Please try again.');
      setDeleting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTransactionTypeChip = (type) => {
    const typeConfig = {
      tailor: { label: 'Tailor', color: 'error' },
      purchase: { label: 'Purchase', color: 'success' },
      grant: { label: 'Grant', color: 'info' },
      refund: { label: 'Refund', color: 'warning' },
      bonus: { label: 'Bonus', color: 'success' },
    };

    const config = typeConfig[type?.toLowerCase()] || typeConfig.tailor;

    return (
      <Chip
        label={config.label}
        color={config.color}
        size="small"
        sx={{ fontWeight: 600 }}
      />
    );
  };

  const handleRecharge = async (_credits) => {
    // Show beta modal instead of Stripe checkout
    setShowBetaModal(true);

    // PRODUCTION CODE (uncomment when ready):
    // setRechargeLoading(true);
    // try {
    //   const { url } = await creditsService.createCheckoutSession(credits, autoRecharge);
    //   window.location.href = url;
    // } catch (error) {
    //   console.error('Failed to create checkout session:', error);
    //   toast.error('Failed to start checkout. Please try again.');
    //   setRechargeLoading(false);
    // }
  };

  const getUserInitials = () => {
    if (!user?.full_name) return 'U';
    const names = user.full_name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return user.full_name[0].toUpperCase();
  };

  // Sidebar content
  const sidebarContent = (
    <Box
      sx={{
        width: isMobile ? 250 : 200,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#ffffff',
        borderRight: isMobile ? 'none' : '1px solid #e0e0e0',
      }}
    >
      {/* Mobile close button */}
      {isMobile && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
          <IconButton onClick={() => setDrawerOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Box>
      )}

      {/* User Info */}
      <Box
        sx={{
          p: 3,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <Avatar
          sx={{
            width: 80,
            height: 80,
            mb: 2,
            bgcolor: colorPalette.primary.darkGreen,
            fontSize: '1.5rem',
            fontWeight: 700,
          }}
        >
          {getUserInitials()}
        </Avatar>
        <Typography variant="h6" fontWeight={700}>
          {user?.full_name || 'User'}
        </Typography>
      </Box>

      {/* Navigation Buttons */}
      <Box sx={{ px: 2, flex: 1 }}>
        <Button
          fullWidth
          startIcon={<DashboardIcon />}
          onClick={() => {
            setActiveTab('dashboard');
            if (isMobile) setDrawerOpen(false);
          }}
          sx={{
            justifyContent: 'flex-start',
            mb: 1,
            bgcolor: activeTab === 'dashboard' ? colorPalette.secondary.lightGreen : 'transparent',
            color: activeTab === 'dashboard' ? colorPalette.primary.darkGreen : 'text.primary',
            fontWeight: activeTab === 'dashboard' ? 700 : 400,
            '&:hover': {
              bgcolor: colorPalette.secondary.lightGreen,
            },
          }}
        >
          Dashboard
        </Button>
        <Button
          fullWidth
          startIcon={<HistoryIcon />}
          onClick={() => {
            setActiveTab('transactions');
            if (isMobile) setDrawerOpen(false);
          }}
          sx={{
            justifyContent: 'flex-start',
            mb: 1,
            bgcolor: activeTab === 'transactions' ? colorPalette.secondary.lightGreen : 'transparent',
            color: activeTab === 'transactions' ? colorPalette.primary.darkGreen : 'text.primary',
            fontWeight: activeTab === 'transactions' ? 700 : 400,
            '&:hover': {
              bgcolor: colorPalette.secondary.lightGreen,
            },
          }}
        >
          Transactions
        </Button>
        <Button
          fullWidth
          startIcon={<AccountBalanceWalletIcon />}
          onClick={() => {
            setActiveTab('recharge');
            if (isMobile) setDrawerOpen(false);
          }}
          sx={{
            justifyContent: 'flex-start',
            mb: 1,
            bgcolor: activeTab === 'recharge' ? colorPalette.secondary.lightGreen : 'transparent',
            color: activeTab === 'recharge' ? colorPalette.primary.darkGreen : 'text.primary',
            fontWeight: activeTab === 'recharge' ? 700 : 400,
            '&:hover': {
              bgcolor: colorPalette.secondary.lightGreen,
            },
          }}
        >
          Recharge
        </Button>
        <Button
          fullWidth
          startIcon={<SettingsIcon />}
          onClick={() => {
            setActiveTab('settings');
            if (isMobile) setDrawerOpen(false);
          }}
          sx={{
            justifyContent: 'flex-start',
            bgcolor: activeTab === 'settings' ? colorPalette.secondary.lightGreen : 'transparent',
            color: activeTab === 'settings' ? colorPalette.primary.darkGreen : 'text.primary',
            fontWeight: activeTab === 'settings' ? 700 : 400,
            '&:hover': {
              bgcolor: colorPalette.secondary.lightGreen,
            },
          }}
        >
          Settings
        </Button>
      </Box>
    </Box>
  );





  if (!user) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="warning">Please log in to view your profile.</Alert>
      </Container>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 48px)', overflow: 'hidden' }}>
      {/* Mobile Menu Button */}
      {isMobile && (
        <IconButton
          onClick={() => setDrawerOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: 1200,
            bgcolor: colorPalette.primary.darkGreen,
            color: '#ffffff',
            boxShadow: 3,
            '&:hover': {
              bgcolor: '#1a8050',
            },
          }}
        >
          <MenuIcon />
        </IconButton>
      )}

      {/* Sidebar - Desktop or Mobile Drawer */}
      {isMobile ? (
        <Drawer
          anchor="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          sx={{
            '& .MuiDrawer-paper': {
              width: 250,
            },
          }}
        >
          {sidebarContent}
        </Drawer>
      ) : (
        <Box sx={{ width: 200, flexShrink: 0 }}>{sidebarContent}</Box>
      )}

      {/* Main Content */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          bgcolor: '#f5f5f5',
          p: isMobile ? 2 : 4,
        }}
      >
        <Container maxWidth="lg">
          {/* User Details Header */}
          <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Email
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  {user?.email}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isMobile ? 'flex-start' : 'flex-end',
                  }}
                >
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Available Credits
                  </Typography>
                  <Typography variant="h3" fontWeight={700} color={colorPalette.primary.darkGreen}>
                    {user?.credits?.toFixed(1) || '0.0'}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* Tab Content */}
          {activeTab === 'dashboard' && (
            <DashboardTab
              loading={loading}
              stats={stats}
              transactions={transactions}
              formatDate={formatDate}
              getTransactionTypeChip={getTransactionTypeChip}
            />
          )}
          {activeTab === 'transactions' && (
            <TransactionsTab
              loading={loading}
              transactions={transactions}
              formatDate={formatDate}
              getTransactionTypeChip={getTransactionTypeChip}
              exportTransactionsCSV={exportTransactionsCSV}
            />
          )}
          {activeTab === 'recharge' && (
            <RechargeTab
              creditPackages={creditPackages}
              autoRecharge={autoRecharge}
              setAutoRecharge={setAutoRecharge}
              rechargeLoading={rechargeLoading}
              handleRecharge={handleRecharge}
            />
          )}
          {activeTab === 'settings' && (
            <SettingsTab
              user={user}
              editingName={editingName}
              newName={newName}
              setNewName={setNewName}
              savingName={savingName}
              showDeleteConfirm={showDeleteConfirm}
              deleting={deleting}
              handleEditName={handleEditName}
              handleSaveName={handleSaveName}
              handleCancelEditName={handleCancelEditName}
              setShowDeleteConfirm={setShowDeleteConfirm}
              handleDeleteAccount={handleDeleteAccount}
            />
          )}
        </Container>
      </Box>

      {/* Beta Version Modal */}
      <Dialog
        open={showBetaModal}
        onClose={() => setShowBetaModal(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 2,
          },
        }}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                bgcolor: 'rgba(76, 175, 80, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography variant="h4">🎉</Typography>
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Beta Version
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Currently in development
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            Thank you for trying SkillMap! We're currently in <strong>beta version</strong> and are working hard to bring you the best experience.
          </Typography>
          <Typography variant="body1" paragraph>
            During this beta phase, all users receive <strong>100 free credits</strong> to test our resume tailoring features.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            💡 Credit recharging will be available soon. Stay tuned for updates!
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={() => setShowBetaModal(false)}
            variant="contained"
            fullWidth
            sx={{
              bgcolor: colorPalette.primary.darkGreen,
              py: 1.5,
              fontSize: '1rem',
              fontWeight: 600,
              '&:hover': {
                bgcolor: '#1a8050',
              },
            }}
          >
            Got it!
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Profile;
