import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Chip,
} from '@mui/material';
import { colorPalette } from '../../styles/theme';

const RechargeTab = ({
  creditPackages,
  autoRecharge,
  setAutoRecharge,
  rechargeLoading,
  handleRecharge,
}) => {
  return (
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
        {creditPackages.map((pkg) => {
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
};

export default RechargeTab;
