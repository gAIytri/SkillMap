import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  InputAdornment,
  Chip,
  CircularProgress,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { colorPalette } from '../../styles/theme';
import adminAuthService from '../../services/adminAuthService';
import toast from 'react-hot-toast';

const CreditsDetailedView = () => {
  const [credits, setCredits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [orderBy, setOrderBy] = useState('revenue');
  const [order, setOrder] = useState('desc');

  useEffect(() => {
    fetchCredits();
  }, []);

  const fetchCredits = async () => {
    try {
      const data = await adminAuthService.getDetailedCredits();
      setCredits(data.credits_breakdown);
    } catch (error) {
      console.error('Failed to fetch credits:', error);
      toast.error('Failed to load credits data');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const sortedCredits = [...credits]
    .filter((user) =>
      user.email.toLowerCase().includes(search.toLowerCase()) ||
      user.full_name.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const aValue = a[orderBy];
      const bValue = b[orderBy];
      if (order === 'asc') {
        return aValue > bValue ? 1 : -1;
      }
      return aValue < bValue ? 1 : -1;
    });

  // Calculate totals
  const totalRevenue = credits.reduce((sum, user) => sum + user.revenue, 0);
  const totalPurchased = credits.reduce((sum, user) => sum + user.total_purchased, 0);
  const totalSpent = credits.reduce((sum, user) => sum + user.total_spent, 0);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={600} mb={{ xs: 2, md: 3 }} sx={{ fontSize: { xs: '1.2rem', md: '1.5rem' } }}>
        Credits & Revenue
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={{ xs: 2, md: 3 }} mb={{ xs: 3, md: 4 }}>
        <Grid item xs={12} md={4}>
          <Card elevation={3}>
            <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
              <Box display="flex" alignItems="center" mb={1}>
                <AttachMoneyIcon sx={{ fontSize: { xs: 28, md: 40 }, color: colorPalette.accent.gold, mr: { xs: 1, md: 2 } }} />
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', md: '0.875rem' } }}>
                    Total Revenue
                  </Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: '1.5rem', md: '2.125rem' } }}>
                    ${totalRevenue.toFixed(2)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card elevation={3}>
            <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
              <Box display="flex" alignItems="center" mb={1}>
                <ShoppingCartIcon sx={{ fontSize: { xs: 28, md: 40 }, color: colorPalette.primary.brightGreen, mr: { xs: 1, md: 2 } }} />
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', md: '0.875rem' } }}>
                    Credits Purchased
                  </Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: '1.5rem', md: '2.125rem' } }}>
                    {totalPurchased.toFixed(0)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card elevation={3}>
            <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
              <Box display="flex" alignItems="center" mb={1}>
                <ShoppingCartIcon sx={{ fontSize: { xs: 28, md: 40 }, color: colorPalette.secondary.mediumGreen, mr: { xs: 1, md: 2 } }} />
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', md: '0.875rem' } }}>
                    Credits Consumed
                  </Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: '1.5rem', md: '2.125rem' } }}>
                    {totalSpent.toFixed(0)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search */}
      <Box mb={{ xs: 2, md: 3 }}>
        <TextField
          placeholder="Search users..."
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ width: { xs: '100%', sm: 300 } }}
        />
      </Box>

      {/* Table */}
      <TableContainer component={Paper} elevation={2} sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: { xs: 700, md: 'auto' } }}>
          <TableHead sx={{ bgcolor: colorPalette.secondary.lightGreen }}>
            <TableRow>
              <TableCell sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' }, py: { xs: 1, md: 2 } }}>Email</TableCell>
              <TableCell sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' }, py: { xs: 1, md: 2 } }}>Name</TableCell>
              <TableCell align="right" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' }, py: { xs: 1, md: 2 } }}>
                <TableSortLabel
                  active={orderBy === 'current_credits'}
                  direction={orderBy === 'current_credits' ? order : 'asc'}
                  onClick={() => handleSort('current_credits')}
                >
                  Current Credits
                </TableSortLabel>
              </TableCell>
              <TableCell align="right" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' }, py: { xs: 1, md: 2 } }}>
                <TableSortLabel
                  active={orderBy === 'total_purchased'}
                  direction={orderBy === 'total_purchased' ? order : 'asc'}
                  onClick={() => handleSort('total_purchased')}
                >
                  Purchased
                </TableSortLabel>
              </TableCell>
              <TableCell align="right" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' }, py: { xs: 1, md: 2 } }}>
                <TableSortLabel
                  active={orderBy === 'total_spent'}
                  direction={orderBy === 'total_spent' ? order : 'asc'}
                  onClick={() => handleSort('total_spent')}
                >
                  Spent
                </TableSortLabel>
              </TableCell>
              <TableCell align="right" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' }, py: { xs: 1, md: 2 } }}>
                <TableSortLabel
                  active={orderBy === 'purchase_count'}
                  direction={orderBy === 'purchase_count' ? order : 'asc'}
                  onClick={() => handleSort('purchase_count')}
                >
                  Purchases
                </TableSortLabel>
              </TableCell>
              <TableCell align="right" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' }, py: { xs: 1, md: 2 } }}>
                <TableSortLabel
                  active={orderBy === 'revenue'}
                  direction={orderBy === 'revenue' ? order : 'asc'}
                  onClick={() => handleSort('revenue')}
                >
                  Revenue
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedCredits.map((user) => (
              <TableRow key={user.user_id} hover>
                <TableCell sx={{ fontSize: { xs: '0.7rem', md: '0.875rem' }, py: { xs: 0.5, md: 1.5 } }}>
                  <Typography variant="body2" fontWeight={500} sx={{ fontSize: { xs: '0.7rem', md: '0.875rem' } }}>
                    {user.email}
                  </Typography>
                </TableCell>
                <TableCell sx={{ fontSize: { xs: '0.7rem', md: '0.875rem' }, py: { xs: 0.5, md: 1.5 } }}>{user.full_name}</TableCell>
                <TableCell align="right" sx={{ py: { xs: 0.5, md: 1.5 } }}>
                  <Chip
                    label={user.current_credits.toFixed(1)}
                    size="small"
                    color={user.current_credits < 10 ? 'error' : 'success'}
                    sx={{ fontSize: { xs: '0.65rem', md: '0.8125rem' }, height: { xs: 20, md: 24 } }}
                  />
                </TableCell>
                <TableCell align="right" sx={{ fontSize: { xs: '0.7rem', md: '0.875rem' }, py: { xs: 0.5, md: 1.5 } }}>{user.total_purchased.toFixed(0)}</TableCell>
                <TableCell align="right" sx={{ fontSize: { xs: '0.7rem', md: '0.875rem' }, py: { xs: 0.5, md: 1.5 } }}>{user.total_spent.toFixed(0)}</TableCell>
                <TableCell align="right" sx={{ fontSize: { xs: '0.7rem', md: '0.875rem' }, py: { xs: 0.5, md: 1.5 } }}>{user.purchase_count}</TableCell>
                <TableCell align="right" sx={{ py: { xs: 0.5, md: 1.5 } }}>
                  <Typography variant="body2" fontWeight={600} color={colorPalette.accent.gold} sx={{ fontSize: { xs: '0.7rem', md: '0.875rem' } }}>
                    ${user.revenue.toFixed(2)}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default CreditsDetailedView;
