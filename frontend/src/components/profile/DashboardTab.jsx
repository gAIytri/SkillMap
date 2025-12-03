import { Box, Typography, Paper, CircularProgress, Card, CardContent, Grid } from '@mui/material';
import WorkIcon from '@mui/icons-material/Work';
import RemoveIcon from '@mui/icons-material/Remove';
import FolderIcon from '@mui/icons-material/Folder';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { colorPalette } from '../../styles/theme';

const DashboardTab = ({ loading, stats, transactions, formatDate, getTransactionTypeChip }) => {
  // Get recent activity (last 10 transactions)
  const recentActivity = transactions.slice(0, 10);

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={3}>
        Dashboard
      </Typography>
      {loading ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Stats Cards */}
          <Grid container spacing={3} mb={4}>
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

          {/* Recent Activity - Full Width */}
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight={700} mb={3} color={colorPalette.primary.darkGreen}>
              Recent Activity
            </Typography>
            {recentActivity.length === 0 ? (
              <Box display="flex" justifyContent="center" alignItems="center" py={4}>
                <Typography variant="body2" color="text.secondary">
                  No recent activity
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={2}>
                {recentActivity.map((activity) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={activity.id}>
                    <Card
                      sx={{
                        bgcolor: '#f9f9f9',
                        border: '1px solid #e0e0e0',
                        '&:hover': {
                          boxShadow: 2,
                          borderColor: colorPalette.primary.brightGreen,
                        },
                      }}
                    >
                      <CardContent sx={{ p: 2 }}>
                        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                                       <Typography
                          variant="body2"
                          color="text.primary"
                          fontWeight={600}
                          sx={{
                            mb: 0.5,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          
                            {activity.project_name || 'N/A'}
                        </Typography>
                          <Typography
                            variant="body2"
                            fontWeight={700}
                            color={activity.amount > 0 ? 'success.main' : 'error.main'}
                          >
                           
                            {activity.amount.toFixed(1) * (-1)} 
                          </Typography>
                        </Box>

                        <Typography variant="caption" color="text.secondary">
                          {formatDate(activity.created_at)}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Paper>
        </>
      )}
    </Box>
  );
};

export default DashboardTab;
