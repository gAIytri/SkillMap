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
  CircularProgress,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import TokenIcon from '@mui/icons-material/Token';
import { colorPalette } from '../../styles/theme';
import adminAuthService from '../../services/adminAuthService';
import toast from 'react-hot-toast';

const TokensDetailedView = () => {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [orderBy, setOrderBy] = useState('total_tokens');
  const [order, setOrder] = useState('desc');

  useEffect(() => {
    fetchTokens();
  }, []);

  const fetchTokens = async () => {
    try {
      const data = await adminAuthService.getDetailedTokens();
      setTokens(data.token_breakdown);
    } catch (error) {
      console.error('Failed to fetch tokens:', error);
      toast.error('Failed to load token data');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const sortedTokens = [...tokens]
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
  const totalTokens = tokens.reduce((sum, user) => sum + user.total_tokens, 0);
  const totalPrompt = tokens.reduce((sum, user) => sum + user.prompt_tokens, 0);
  const totalCompletion = tokens.reduce((sum, user) => sum + user.completion_tokens, 0);

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
        Token Usage
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={{ xs: 2, md: 3 }} mb={{ xs: 3, md: 4 }}>
        <Grid item xs={12} md={4}>
          <Card elevation={3}>
            <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
              <Box display="flex" alignItems="center" mb={1}>
                <TokenIcon sx={{ fontSize: { xs: 28, md: 40 }, color: colorPalette.primary.brightGreen, mr: { xs: 1, md: 2 } }} />
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', md: '0.875rem' } }}>
                    Total Tokens
                  </Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: '1.5rem', md: '2.125rem' } }}>
                    {totalTokens.toLocaleString()}
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
                <TokenIcon sx={{ fontSize: { xs: 28, md: 40 }, color: colorPalette.secondary.mediumGreen, mr: { xs: 1, md: 2 } }} />
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', md: '0.875rem' } }}>
                    Prompt Tokens
                  </Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: '1.5rem', md: '2.125rem' } }}>
                    {totalPrompt.toLocaleString()}
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
                <TokenIcon sx={{ fontSize: { xs: 28, md: 40 }, color: colorPalette.accent.gold, mr: { xs: 1, md: 2 } }} />
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', md: '0.875rem' } }}>
                    Completion Tokens
                  </Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: '1.5rem', md: '2.125rem' } }}>
                    {totalCompletion.toLocaleString()}
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
        <Table size="small" sx={{ minWidth: { xs: 900, md: 'auto' } }}>
          <TableHead sx={{ bgcolor: colorPalette.secondary.lightGreen }}>
            <TableRow>
              <TableCell sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' }, py: { xs: 1, md: 2 } }}>Email</TableCell>
              <TableCell sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' }, py: { xs: 1, md: 2 } }}>Name</TableCell>
              <TableCell align="right" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' }, py: { xs: 1, md: 2 } }}>
                <TableSortLabel
                  active={orderBy === 'total_tokens'}
                  direction={orderBy === 'total_tokens' ? order : 'asc'}
                  onClick={() => handleSort('total_tokens')}
                >
                  Total Tokens
                </TableSortLabel>
              </TableCell>
              <TableCell align="right" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' }, py: { xs: 1, md: 2 } }}>
                <TableSortLabel
                  active={orderBy === 'prompt_tokens'}
                  direction={orderBy === 'prompt_tokens' ? order : 'asc'}
                  onClick={() => handleSort('prompt_tokens')}
                >
                  Prompt
                </TableSortLabel>
              </TableCell>
              <TableCell align="right" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' }, py: { xs: 1, md: 2 } }}>
                <TableSortLabel
                  active={orderBy === 'completion_tokens'}
                  direction={orderBy === 'completion_tokens' ? order : 'asc'}
                  onClick={() => handleSort('completion_tokens')}
                >
                  Completion
                </TableSortLabel>
              </TableCell>
              <TableCell align="right" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' }, py: { xs: 1, md: 2 } }}>
                <TableSortLabel
                  active={orderBy === 'tailoring_count'}
                  direction={orderBy === 'tailoring_count' ? order : 'asc'}
                  onClick={() => handleSort('tailoring_count')}
                >
                  Tailorings
                </TableSortLabel>
              </TableCell>
              <TableCell align="right" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' }, py: { xs: 1, md: 2 } }}>
                <TableSortLabel
                  active={orderBy === 'avg_tokens_per_tailoring'}
                  direction={orderBy === 'avg_tokens_per_tailoring' ? order : 'asc'}
                  onClick={() => handleSort('avg_tokens_per_tailoring')}
                >
                  Avg/Tailoring
                </TableSortLabel>
              </TableCell>
              <TableCell align="right" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' }, py: { xs: 1, md: 2 } }}>Credits Used</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedTokens.map((user) => (
              <TableRow key={user.user_id} hover>
                <TableCell sx={{ fontSize: { xs: '0.7rem', md: '0.875rem' }, py: { xs: 0.5, md: 1.5 } }}>
                  <Typography variant="body2" fontWeight={500} sx={{ fontSize: { xs: '0.7rem', md: '0.875rem' } }}>
                    {user.email}
                  </Typography>
                </TableCell>
                <TableCell sx={{ fontSize: { xs: '0.7rem', md: '0.875rem' }, py: { xs: 0.5, md: 1.5 } }}>{user.full_name}</TableCell>
                <TableCell align="right" sx={{ py: { xs: 0.5, md: 1.5 } }}>
                  <Typography variant="body2" fontWeight={600} sx={{ fontSize: { xs: '0.7rem', md: '0.875rem' } }}>
                    {user.total_tokens.toLocaleString()}
                  </Typography>
                </TableCell>
                <TableCell align="right" sx={{ fontSize: { xs: '0.7rem', md: '0.875rem' }, py: { xs: 0.5, md: 1.5 } }}>{user.prompt_tokens.toLocaleString()}</TableCell>
                <TableCell align="right" sx={{ fontSize: { xs: '0.7rem', md: '0.875rem' }, py: { xs: 0.5, md: 1.5 } }}>{user.completion_tokens.toLocaleString()}</TableCell>
                <TableCell align="right" sx={{ fontSize: { xs: '0.7rem', md: '0.875rem' }, py: { xs: 0.5, md: 1.5 } }}>{user.tailoring_count}</TableCell>
                <TableCell align="right" sx={{ fontSize: { xs: '0.7rem', md: '0.875rem' }, py: { xs: 0.5, md: 1.5 } }}>{user.avg_tokens_per_tailoring.toLocaleString()}</TableCell>
                <TableCell align="right" sx={{ py: { xs: 0.5, md: 1.5 } }}>
                  <Typography variant="body2" color={colorPalette.accent.gold} sx={{ fontSize: { xs: '0.7rem', md: '0.875rem' } }}>
                    {user.credits_consumed.toFixed(1)}
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

export default TokensDetailedView;
