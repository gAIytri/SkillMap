import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  Avatar,
  Button,
  Divider,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import EmailIcon from '@mui/icons-material/Email';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import creditsService from '../services/creditsService';
import RechargeDialog from '../components/credits/RechargeDialog';
import { colorPalette } from '../styles/theme';

const Profile = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, refreshUser } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rechargeDialogOpen, setRechargeDialogOpen] = useState(false);
  const hasShownToast = useRef(false); // Prevent duplicate toasts in StrictMode
  const isMounted = useRef(true); // Track if component is mounted

  // Stable callback for loading transactions
  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await creditsService.getTransactions(50, 0);

      // Only update state if component is still mounted
      if (isMounted.current) {
        setTransactions(data);
      }
    } catch (error) {
      console.error('Failed to load transactions:', error);
      if (isMounted.current) {
        toast.error('Failed to load transaction history');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []); // No dependencies - creditsService is stable

  useEffect(() => {
    // Set mounted flag
    isMounted.current = true;

    // Load data sequentially to avoid race conditions
    const loadData = async () => {
      // First refresh user to get latest credits
      if (refreshUser) {
        await refreshUser();
      }

      // Then load transactions (only if still mounted)
      if (isMounted.current) {
        await loadTransactions();
      }
    };

    loadData();

    // Check for payment status from Stripe redirect
    const payment = searchParams.get('payment');

    // Only show toast once (prevent duplicates in React StrictMode)
    if (payment && !hasShownToast.current) {
      hasShownToast.current = true;

      if (payment === 'success') {
        toast.success('Payment successful! Your credits have been added.', { duration: 5000 });
      } else if (payment === 'cancelled') {
        toast.error('Payment was cancelled.', { duration: 4000 });
      }

      // Clean up URL after a short delay to ensure toast is shown
      setTimeout(() => {
        if (isMounted.current) {
          window.history.replaceState({}, '', '/profile');
        }
      }, 100);
    }

    // Cleanup function
    return () => {
      isMounted.current = false;
    };
  }, [searchParams, loadTransactions, refreshUser]); // All dependencies included

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

  if (!user) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="warning">Please log in to view your profile.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/dashboard')}
          sx={{ color: colorPalette.primary }}
        >
          Back to Dashboard
        </Button>
      </Box>

      {/* User Profile Card */}
      <Paper sx={{ p: 4, mb: 3, borderRadius: 2 }}>
        <Box display="flex" alignItems="center" gap={3} mb={3}>
          <Avatar
            src={user.profile_picture_url}
            alt={user.full_name}
            sx={{ width: 80, height: 80 }}
          >
            {user.full_name?.[0]?.toUpperCase() || 'U'}
          </Avatar>
          <Box flex={1}>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              {user.full_name}
            </Typography>
            <Box display="flex" alignItems="center" gap={1} mb={0.5}>
              <EmailIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                {user.email}
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              <CalendarTodayIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                Member since {formatDate(user.created_at).split(',')[0]}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Credits Section */}
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={2}>
            <AccountBalanceWalletIcon sx={{ fontSize: 40, color: colorPalette.primary }} />
            <Box>
              <Typography variant="h3" fontWeight={700} color={colorPalette.primary}>
                {user.credits?.toFixed(1) || '0.0'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Available Credits
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            onClick={() => setRechargeDialogOpen(true)}
            sx={{
              bgcolor: colorPalette.primary,
              '&:hover': {
                bgcolor: colorPalette.primaryDark,
              },
            }}
          >
            Recharge Credits
          </Button>
        </Box>
      </Paper>

      {/* Transaction History */}
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="h5" fontWeight={700} mb={3}>
          Transaction History
        </Typography>

        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : transactions.length === 0 ? (
          <Alert severity="info">No transactions yet. Start tailoring resumes!</Alert>
        ) : (
          <TableContainer>
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
      </Paper>

      {/* Recharge Dialog */}
      <RechargeDialog
        open={rechargeDialogOpen}
        onClose={() => setRechargeDialogOpen(false)}
        currentCredits={user.credits}
        blocking={false}
      />
    </Container>
  );
};

export default Profile;
