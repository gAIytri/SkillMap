import { Box, Paper, Typography, Grid, Card, CardContent } from '@mui/material';
import { ResponsiveLine } from '@nivo/line';
import { ResponsiveBar } from '@nivo/bar';
import { colorPalette } from '../../styles/theme';
import TokenIcon from '@mui/icons-material/Token';
import BarChartIcon from '@mui/icons-material/BarChart';

const TokenAnalytics = ({ data }) => {
  if (!data) return null;

  // Format data for line chart
  const lineChartData = [
    {
      id: 'Tokens Used',
      data: data.tokens_over_time.map((item) => ({
        x: item.date,
        y: item.tokens,
      })),
    },
  ];

  // Format data for bar chart (top consumers)
  const barChartData = data.top_consumers.slice(0, 10).map((consumer) => ({
    email: consumer.email.split('@')[0], // Short email
    tokens: consumer.total_tokens,
  }));

  return (
    <Box>
      <Typography variant="h5" fontWeight={600} mb={3} color={colorPalette.primary.darkGreen}>
        Token Usage Analytics
      </Typography>

      {/* Metrics Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <TokenIcon sx={{ fontSize: 40, color: colorPalette.primary.brightGreen, mr: 2 }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Tokens
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {data.total_tokens.toLocaleString()}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <BarChartIcon sx={{ fontSize: 40, color: colorPalette.secondary.mediumGreen, mr: 2 }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Avg Tokens per User
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {data.avg_tokens_per_user.toLocaleString()}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        <Grid item xs={12} lg={6}>
          <Paper elevation={3} sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" fontWeight={600} mb={2}>
              Token Usage Over Time
            </Typography>
            <Box height={320}>
              <ResponsiveLine
                data={lineChartData}
                margin={{ top: 20, right: 20, bottom: 60, left: 80 }}
                xScale={{ type: 'point' }}
                yScale={{ type: 'linear', min: 'auto', max: 'auto' }}
                axisBottom={{
                  tickRotation: -45,
                  legend: 'Date',
                  legendOffset: 50,
                  legendPosition: 'middle',
                }}
                axisLeft={{
                  legend: 'Tokens',
                  legendOffset: -60,
                  legendPosition: 'middle',
                }}
                colors={[colorPalette.primary.brightGreen]}
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
        </Grid>

        <Grid item xs={12} lg={6}>
          <Paper elevation={3} sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" fontWeight={600} mb={2}>
              Top Token Consumers
            </Typography>
            <Box height={320}>
              <ResponsiveBar
                data={barChartData}
                keys={['tokens']}
                indexBy="email"
                margin={{ top: 20, right: 20, bottom: 60, left: 80 }}
                padding={0.3}
                valueScale={{ type: 'linear' }}
                colors={[colorPalette.secondary.mediumGreen]}
                axisBottom={{
                  tickRotation: -45,
                  legend: 'User',
                  legendOffset: 50,
                  legendPosition: 'middle',
                }}
                axisLeft={{
                  legend: 'Tokens',
                  legendOffset: -60,
                  legendPosition: 'middle',
                }}
                labelSkipWidth={12}
                labelSkipHeight={12}
              />
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TokenAnalytics;
