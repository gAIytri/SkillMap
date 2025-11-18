import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Chip,
  Grid,
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import toast from 'react-hot-toast';
import creditsService from '../../services/creditsService';
import { colorPalette } from '../../styles/theme';

const RechargeDialog = ({ open, onClose, currentCredits, blocking = false }) => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);

  useEffect(() => {
    if (open) {
      loadPackages();
    }
  }, [open]);

  const loadPackages = async () => {
    try {
      const data = await creditsService.getPackages();
      setPackages(data);

      // Pre-select the first package
      if (data.length > 0) {
        setSelectedPackage(data[0]);
      }
    } catch (error) {
      console.error('Failed to load credit packages:', error);
      toast.error('Failed to load credit packages');
    }
  };

  const handlePurchase = async () => {
    if (!selectedPackage) {
      toast.error('Please select a credit package');
      return;
    }

    setLoading(true);
    try {
      const { url } = await creditsService.createCheckoutSession(selectedPackage.credits);

      // Redirect to Stripe checkout
      window.location.href = url;
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      toast.error('Failed to start payment process. Please try again.');
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!blocking && !loading) {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        },
      }}
      BackdropProps={{
        sx: {
          backdropFilter: 'blur(8px)',
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <AccountBalanceWalletIcon sx={{ color: colorPalette.primary, fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight={700}>
              {blocking ? 'Insufficient Credits' : 'Recharge Credits'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Current Balance: <strong>{currentCredits?.toFixed(1) || '0.0'} credits</strong>
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        {blocking && (
          <Box
            sx={{
              mb: 3,
              p: 2,
              bgcolor: '#fff3e0',
              borderRadius: 1,
              border: '1px solid #ffb74d',
            }}
          >
            <Typography variant="body2" color="#e65100" fontWeight={600}>
              You need at least 5 credits to tailor a resume. Please purchase more credits to continue.
            </Typography>
          </Box>
        )}

        {!blocking && currentCredits < 10 && (
          <Box
            sx={{
              mb: 3,
              p: 2,
              bgcolor: '#e3f2fd',
              borderRadius: 1,
              border: '1px solid #64b5f6',
            }}
          >
            <Typography variant="body2" color="#1565c0" fontWeight={600}>
              Your credits are running low. Consider recharging to avoid interruptions.
            </Typography>
          </Box>
        )}

        <Typography variant="h6" fontWeight={600} mb={2}>
          Select a Package
        </Typography>

        <Grid container spacing={2}>
          {packages.map((pkg) => (
            <Grid item xs={12} sm={6} key={pkg.credits}>
              <Card
                onClick={() => setSelectedPackage(pkg)}
                sx={{
                  cursor: 'pointer',
                  border: selectedPackage?.credits === pkg.credits
                    ? `2px solid ${colorPalette.primary}`
                    : '2px solid transparent',
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                  position: 'relative',
                  overflow: 'visible',
                }}
              >
                {pkg.savings && (
                  <Chip
                    label={pkg.savings}
                    color="success"
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: -10,
                      right: 10,
                      fontWeight: 700,
                    }}
                  />
                )}
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                    <Typography variant="h4" fontWeight={700} color={colorPalette.primary}>
                      {pkg.credits}
                    </Typography>
                    {selectedPackage?.credits === pkg.credits && (
                      <CheckCircleIcon sx={{ color: colorPalette.primary, fontSize: 28 }} />
                    )}
                  </Box>
                  <Typography variant="body2" color="text.secondary" mb={1}>
                    Credits
                  </Typography>
                  <Typography variant="h5" fontWeight={700}>
                    ${pkg.price_usd.toFixed(2)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    ${(pkg.price_usd / pkg.credits).toFixed(3)} per credit
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Box sx={{ mt: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
            ℹ️ Credits are used for AI-powered resume tailoring
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            💳 Secure payment powered by Stripe
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        {!blocking && (
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
        )}
        <Button
          variant="contained"
          onClick={handlePurchase}
          disabled={!selectedPackage || loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
          sx={{
            bgcolor: colorPalette.primary,
            '&:hover': {
              bgcolor: colorPalette.primaryDark,
            },
          }}
        >
          {loading ? 'Processing...' : `Purchase ${selectedPackage?.credits || 0} Credits`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RechargeDialog;
