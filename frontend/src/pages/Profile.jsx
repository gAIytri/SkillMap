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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Card,
  CardContent,
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
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import WorkIcon from '@mui/icons-material/Work';
import FolderIcon from '@mui/icons-material/Folder';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import creditsService from '../services/creditsService';
import projectService from '../services/projectService';
import { colorPalette } from '../styles/theme';

const Profile = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, refreshUser } = useAuth();
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

      // Calculate stats
      const tailors = transactionsData.filter(t => t.transaction_type === 'TAILOR').length;
      const creditsUsed = transactionsData
        .filter(t => t.transaction_type === 'TAILOR')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const creditsPurchased = transactionsData
        .filter(t => t.transaction_type === 'PURCHASE')
        .reduce((sum, t) => sum + t.amount, 0);

      // Load projects count
      const projects = await projectService.getAllProjects();

      if (isMounted.current) {
        setStats({
          totalTailors: tailors,
          totalCreditsUsed: creditsUsed,
          totalCreditsPurchased: creditsPurchased,
          totalProjects: projects.length,
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
  }, [refreshUser, loadTransactions, loadStats]);

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
      TAILOR: { label: 'Tailor', color: 'error', icon: <RemoveIcon sx={{ fontSize: 16 }} /> },
      PURCHASE: { label: 'Purchase', color: 'success', icon: <AddIcon sx={{ fontSize: 16 }} /> },
      GRANT: { label: 'Grant', color: 'info', icon: <AddIcon sx={{ fontSize: 16 }} /> },
      REFUND: { label: 'Refund', color: 'warning', icon: <AddIcon sx={{ fontSize: 16 }} /> },
      BONUS: { label: 'Bonus', color: 'success', icon: <AddIcon sx={{ fontSize: 16 }} /> },
    };

    const config = typeConfig[type] || typeConfig.TAILOR;

    return (
      <Chip
        label={config.label}
        color={config.color}
        size="small"
        icon={config.icon}
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
      </Box>
    </Box>
  );

  // Dashboard Tab Content
  const renderDashboard = () => (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={3}>
        Dashboard
      </Typography>
      {loading ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {/* Total Tailors */}
          <Grid item xs={12} sm={6} md={6}>
            <Card
              sx={{
                bgcolor: colorPalette.secondary.lightGreen,
                borderLeft: `4px solid ${colorPalette.primary.darkGreen}`,
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Total Tailors
                    </Typography>
                    <Typography variant="h3" fontWeight={700} color={colorPalette.primary.darkGreen}>
                      {stats.totalTailors}
                    </Typography>
                  </Box>
                  <WorkIcon sx={{ fontSize: 48, color: colorPalette.primary.darkGreen, opacity: 0.3 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Total Projects */}
          <Grid item xs={12} sm={6} md={6}>
            <Card
              sx={{
                bgcolor: '#E3F2FD',
                borderLeft: '4px solid #2196F3',
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Total Projects
                    </Typography>
                    <Typography variant="h3" fontWeight={700} color="#2196F3">
                      {stats.totalProjects}
                    </Typography>
                  </Box>
                  <FolderIcon sx={{ fontSize: 48, color: '#2196F3', opacity: 0.3 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Credits Used */}
          <Grid item xs={12} sm={6} md={6}>
            <Card
              sx={{
                bgcolor: '#FFEBEE',
                borderLeft: '4px solid #F44336',
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Credits Used
                    </Typography>
                    <Typography variant="h3" fontWeight={700} color="#F44336">
                      {stats.totalCreditsUsed.toFixed(1)}
                    </Typography>
                  </Box>
                  <RemoveIcon sx={{ fontSize: 48, color: '#F44336', opacity: 0.3 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Credits Purchased */}
          <Grid item xs={12} sm={6} md={6}>
            <Card
              sx={{
                bgcolor: '#E8F5E9',
                borderLeft: '4px solid #4CAF50',
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Credits Purchased
                    </Typography>
                    <Typography variant="h3" fontWeight={700} color="#4CAF50">
                      {stats.totalCreditsPurchased.toFixed(1)}
                    </Typography>
                  </Box>
                  <TrendingUpIcon sx={{ fontSize: 48, color: '#4CAF50', opacity: 0.3 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );

  // Transactions Tab Content
  const renderTransactions = () => (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={3}>
        Transaction History
      </Typography>
      {loading ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      ) : transactions.length === 0 ? (
        <Alert severity="info">No transactions yet. Start tailoring resumes!</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <Typography variant="body2" fontWeight={700}>
                    Date
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={700}>
                    Type
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={700}>
                    Description
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight={700}>
                    Amount
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight={700}>
                    Balance After
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight={700}>
                    Tokens
                  </Typography>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id} hover>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDate(transaction.created_at)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {getTransactionTypeChip(transaction.transaction_type)}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ maxWidth: 400 }}>
                      {transaction.description || 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      color={transaction.amount > 0 ? 'success.main' : 'error.main'}
                    >
                      {transaction.amount > 0 ? '+' : ''}
                      {transaction.amount.toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">
                      {transaction.balance_after.toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="text.secondary">
                      {transaction.tokens_used ? transaction.tokens_used.toLocaleString() : '—'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );

  // Recharge Tab Content
  const renderRecharge = () => (
    <Box>
      {/* Header Section */}
      <Box mb={4}>
        <Typography variant="h5" fontWeight={700} mb={1}>
          Choose Your Plan
        </Typography>
        <Typography variant="body1" color="text.secondary" mb={3}>
          Get more credits, save more, and never run out with auto-recharge
        </Typography>

        {/* Auto-Recharge Toggle */}
        <Paper
          sx={{
            p: 3,
            bgcolor: autoRecharge ? 'rgba(76, 175, 80, 0.08)' : '#f9f9f9',
            border: '2px solid',
            borderColor: autoRecharge ? colorPalette.primary.brightGreen : '#e0e0e0',
            borderRadius: 2,
            transition: 'all 0.3s',
          }}
        >
          <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
            <Box flex={1}>
              <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                <Typography variant="h6" fontWeight={700}>
                  Enable Auto-Recharge
                </Typography>
                <Chip
                  label="Get Bonus Credits!"
                  size="small"
                  sx={{
                    bgcolor: colorPalette.primary.brightGreen,
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.7rem',
                  }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                Automatically recharge when you run low. Get <strong>+20 bonus credits</strong> on every recharge and never interrupt your workflow!
              </Typography>
            </Box>
            <Button
              variant={autoRecharge ? 'contained' : 'outlined'}
              onClick={() => setAutoRecharge(!autoRecharge)}
              sx={{
                bgcolor: autoRecharge ? colorPalette.primary.brightGreen : 'transparent',
                color: autoRecharge ? '#ffffff' : colorPalette.primary.darkGreen,
                borderColor: colorPalette.primary.darkGreen,
                fontWeight: 700,
                px: 4,
                '&:hover': {
                  bgcolor: autoRecharge ? '#1a8050' : colorPalette.secondary.lightGreen,
                },
              }}
            >
              {autoRecharge ? 'Enabled ✓' : 'Enable'}
            </Button>
          </Box>
        </Paper>
      </Box>

      {/* Pricing Cards */}
      <Grid container spacing={3}>
        {creditPackages.map((pkg, index) => {
          const totalCredits = autoRecharge ? pkg.credits + pkg.autoBonus : pkg.credits;

          return (
            <Grid item xs={12} sm={6} md={6} key={pkg.credits}>
              <Card
                sx={{
                  height: '100%',
                  border: '1px solid',
                  borderColor: '#e0e0e0',
                  position: 'relative',
                  bgcolor: '#ffffff',
                }}
              >
                {/* Savings Badge */}
                {pkg.savings && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 16,
                      right: 16,
                      bgcolor: '#ff6b35',
                      color: '#ffffff',
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 1,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    SAVE {pkg.savings}%
                  </Box>
                )}

                <CardContent sx={{ p: 3 }}>
                  {/* Credits Display */}
                  <Box textAlign="center" mb={2}>
                    <Typography variant="h2" fontWeight={700} color={colorPalette.primary.darkGreen}>
                      {pkg.credits}
                    </Typography>
                    {autoRecharge && (
                      <Box display="flex" alignItems="center" justifyContent="center" gap={0.5} mt={0.5}>
                        <Typography variant="body2" color="text.secondary">
                          +
                        </Typography>
                        <Chip
                          label={`${pkg.autoBonus} BONUS`}
                          size="small"
                          sx={{
                            bgcolor: colorPalette.primary.brightGreen,
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: '0.7rem',
                          }}
                        />
                      </Box>
                    )}
                    <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                      Credits {autoRecharge && `(${totalCredits} total with bonus)`}
                    </Typography>
                  </Box>

                  {/* Price */}
                  <Box textAlign="center" mb={2}>
                    <Typography variant="h3" fontWeight={700} color="#1a1a1a">
                      ${pkg.price.toFixed(2)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ${pkg.perCredit.toFixed(2)} per credit
                    </Typography>
                  </Box>

                  {/* Features */}
                  <Box mb={2}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', mb: 1, fontWeight: 600 }}
                    >
                      What you get:
                    </Typography>
                    <Box display="flex" flexDirection="column" gap={0.5}>
                      <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        ✓ {pkg.tailorings} resume tailorings
                      </Typography>
                      {autoRecharge && (
                        <Typography
                          variant="body2"
                          sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: colorPalette.primary.brightGreen, fontWeight: 600 }}
                        >
                          ✓ +{pkg.autoBonus} bonus credits
                        </Typography>
                      )}
                      {autoRecharge && (
                        <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          ✓ Never run out of credits
                        </Typography>
                      )}
                      <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        ✓ Cover letters & emails
                      </Typography>
                    </Box>
                  </Box>

                  {/* Purchase Button */}
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={() => handleRecharge(pkg.credits)}
                    disabled={rechargeLoading}
                    sx={{
                      mt: 2,
                      py: 1.5,
                      bgcolor: colorPalette.primary.darkGreen,
                      fontSize: '1rem',
                      fontWeight: 700,
                      '&:hover': {
                        bgcolor: '#1a8050',
                      },
                    }}
                  >
                    {rechargeLoading ? (
                      <CircularProgress size={24} sx={{ color: '#ffffff' }} />
                    ) : (
                      `Get ${autoRecharge ? totalCredits : pkg.credits} Credits`
                    )}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Trust & Benefits Section */}
      <Paper sx={{ p: 3, mt: 4, bgcolor: '#f9f9f9', borderRadius: 2 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Box textAlign="center">
              <Typography variant="h6" fontWeight={700} color={colorPalette.primary.darkGreen} gutterBottom>
                💳 Secure Payment
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Powered by Stripe. Your payment info is encrypted and secure.
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box textAlign="center">
              <Typography variant="h6" fontWeight={700} color={colorPalette.primary.darkGreen} gutterBottom>
                ⚡ Instant Delivery
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Credits added to your account immediately after purchase.
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box textAlign="center">
              <Typography variant="h6" fontWeight={700} color={colorPalette.primary.darkGreen} gutterBottom>
                🎯 Never Expire
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Your credits never expire. Use them whenever you need.
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>
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
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'transactions' && renderTransactions()}
          {activeTab === 'recharge' && renderRecharge()}
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
