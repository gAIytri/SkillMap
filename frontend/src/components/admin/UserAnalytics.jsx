import { Box, Paper, Typography, Grid, Card, CardContent } from '@mui/material';
import { ResponsiveLine } from '@nivo/line';
import { colorPalette } from '../../styles/theme';
import PeopleIcon from '@mui/icons-material/People';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

const UserAnalytics = ({ data }) => {
  if (!data) return null;

  // Format data for Nivo line chart
  const chartData = [
    {
      id: 'New Users',
      data: data.new_users_over_time.map((item) => ({
        x: item.date,
        y: item.count,
      })),
    },
  ];

  return (
    <Box>
      <Typography variant="h5" fontWeight={600} mb={3} color={colorPalette.primary.darkGreen}>
        User Analytics
      </Typography>

      {/* Metrics Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={4}>
          <Card elevation={3}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <PeopleIcon sx={{ fontSize: 40, color: colorPalette.primary.brightGreen, mr: 2 }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Users
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {data.total_users}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card elevation={3}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <PersonAddIcon sx={{ fontSize: 40, color: colorPalette.secondary.mediumGreen, mr: 2 }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Active Users
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {data.active_users}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card elevation={3}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <TrendingUpIcon sx={{ fontSize: 40, color: colorPalette.accent.gold, mr: 2 }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Growth Rate
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {data.growth_rate}%
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
          New Users Over Time
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
              legend: 'Users',
              legendOffset: -45,
              legendPosition: 'middle',
            }}
            colors={[colorPalette.primary.brightGreen]}
            pointSize={10}
            pointColor={{ theme: 'background' }}
            pointBorderWidth={2}
            pointBorderColor={{ from: 'serieColor' }}
            enablePointLabel={false}
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

export default UserAnalytics;
