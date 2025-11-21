import { Box, Paper, Typography, Grid, Card, CardContent } from '@mui/material';
import { ResponsiveBar } from '@nivo/bar';
import { colorPalette } from '../../styles/theme';
import FolderIcon from '@mui/icons-material/Folder';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import TodayIcon from '@mui/icons-material/Today';
import DateRangeIcon from '@mui/icons-material/DateRange';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PercentIcon from '@mui/icons-material/Percent';

const RetentionAnalytics = ({ data }) => {
  if (!data) return null;

  // Format data for active users bar chart
  const activeUsersData = [
    { period: 'DAU', users: data.daily_active_users, color: colorPalette.primary.brightGreen },
    { period: 'WAU', users: data.weekly_active_users, color: colorPalette.secondary.mediumGreen },
    { period: 'MAU', users: data.monthly_active_users, color: colorPalette.primary.darkGreen },
  ];

  return (
    <Box>
      <Typography variant="h5" fontWeight={600} mb={3} color={colorPalette.primary.darkGreen}>
        Retention & Usage Analytics
      </Typography>

      {/* Metrics Cards - Projects & Tailorings */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={4}>
          <Card elevation={3}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <FolderIcon sx={{ fontSize: 40, color: colorPalette.primary.brightGreen, mr: 2 }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Projects
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {data.total_projects}
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
                <AutoFixHighIcon sx={{ fontSize: 40, color: colorPalette.secondary.mediumGreen, mr: 2 }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Tailorings
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {data.total_tailorings}
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
                <PercentIcon sx={{ fontSize: 40, color: colorPalette.accent.gold, mr: 2 }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Avg Tailorings/User
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {data.avg_tailorings_per_user.toFixed(1)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Active Users Metrics */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={3}>
          <Card elevation={3}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <TodayIcon sx={{ fontSize: 40, color: colorPalette.primary.brightGreen, mr: 2 }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Daily Active Users
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {data.daily_active_users}
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
                <DateRangeIcon sx={{ fontSize: 40, color: colorPalette.secondary.mediumGreen, mr: 2 }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Weekly Active Users
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {data.weekly_active_users}
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
                <CalendarMonthIcon sx={{ fontSize: 40, color: colorPalette.primary.darkGreen, mr: 2 }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Monthly Active Users
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {data.monthly_active_users}
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
                <PercentIcon sx={{ fontSize: 40, color: colorPalette.accent.gold, mr: 2 }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    7-Day Retention
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {data.retention_rate_7d.toFixed(1)}%
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Bar Chart */}
      <Paper elevation={3} sx={{ p: 3, height: 400 }}>
        <Typography variant="h6" fontWeight={600} mb={2}>
          Active Users Comparison
        </Typography>
        <Box height={320}>
          <ResponsiveBar
            data={activeUsersData}
            keys={['users']}
            indexBy="period"
            margin={{ top: 20, right: 20, bottom: 60, left: 60 }}
            padding={0.3}
            valueScale={{ type: 'linear' }}
            colors={(bar) => bar.data.color}
            axisBottom={{
              legend: 'Period',
              legendOffset: 40,
              legendPosition: 'middle',
            }}
            axisLeft={{
              legend: 'Users',
              legendOffset: -45,
              legendPosition: 'middle',
            }}
            labelSkipWidth={12}
            labelSkipHeight={12}
            label={(d) => `${d.value}`}
          />
        </Box>
      </Paper>
    </Box>
  );
};

export default RetentionAnalytics;
