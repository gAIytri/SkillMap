import { Box, Paper, Typography, Grid, Card, CardContent } from '@mui/material';
import { ResponsiveLine } from '@nivo/line';
import { colorPalette } from '../../styles/theme';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';

const CreditsAnalytics = ({ data }) => {
  if (!data) return null;

  // Format data for line chart
  const chartData = [
    {
      id: 'Credits Purchased',
      data: data.credits_over_time.map((item) => ({
        x: item.date,
        y: item.credits,
      })),
    },
  ];

  return (
    <Box>
      <Typography variant="h5" fontWeight={600} mb={3} color={colorPalette.primary.darkGreen}>
        Credits & Revenue Analytics
      </Typography>

      {/* Metrics Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={3}>
          <Card elevation={3}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <AttachMoneyIcon sx={{ fontSize: 40, color: colorPalette.accent.gold, mr: 2 }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Revenue
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    ${data.revenue.toFixed(2)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card elevation={3}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <ShoppingCartIcon sx={{ fontSize: 40, color: colorPalette.primary.brightGreen, mr: 2 }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Credits Purchased
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {data.credits_purchased.toFixed(0)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card elevation={3}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <AccountBalanceWalletIcon sx={{ fontSize: 40, color: colorPalette.secondary.mediumGreen, mr: 2 }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Credits Spent
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {data.credits_spent.toFixed(0)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card elevation={3}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <TrendingUpIcon sx={{ fontSize: 40, color: colorPalette.primary.darkGreen, mr: 2 }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Avg Purchase Size
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {data.avg_purchase_size.toFixed(0)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Line Chart */}
      <Paper elevation={3} sx={{ p: 3, height: 400 }}>
        <Typography variant="h6" fontWeight={600} mb={2}>
          Credit Purchases Over Time
        </Typography>
        <Box height={320}>
          <ResponsiveLine
            data={chartData}
            margin={{ top: 20, right: 20, bottom: 60, left: 60 }}
            xScale={{ type: 'point' }}
            yScale={{ type: 'linear', min: 'auto', max: 'auto' }}
            axisBottom={{
              tickRotation: -45,
              legend: 'Date',
              legendOffset: 50,
              legendPosition: 'middle',
            }}
            axisLeft={{
              legend: 'Credits',
              legendOffset: -45,
              legendPosition: 'middle',
            }}
            colors={[colorPalette.accent.gold]}
            pointSize={10}
            pointColor={{ theme: 'background' }}
            pointBorderWidth={2}
            pointBorderColor={{ from: 'serieColor' }}
            useMesh={true}
            curve="monotoneX"
            enableArea={true}
            areaOpacity={0.1}
          />
        </Box>
      </Paper>
    </Box>
  );
};

export default CreditsAnalytics;
