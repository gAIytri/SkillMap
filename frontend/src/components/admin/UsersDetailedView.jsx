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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import { colorPalette } from '../../styles/theme';
import adminAuthService from '../../services/adminAuthService';
import toast from 'react-hot-toast';

const UsersDetailedView = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [orderBy, setOrderBy] = useState('credits');
  const [order, setOrder] = useState('desc');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newCredits, setNewCredits] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await adminAuthService.getDetailedUsers();
      setUsers(data.users);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleEditClick = (user) => {
    setSelectedUser(user);
    setNewCredits(user.credits.toFixed(1));
    setEditDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setEditDialogOpen(false);
    setSelectedUser(null);
    setNewCredits('');
  };

  const handleSaveCredits = async () => {
    if (!selectedUser) return;

    const creditsValue = parseFloat(newCredits);
    if (isNaN(creditsValue) || creditsValue < 0) {
      toast.error('Please enter a valid credit amount');
      return;
    }

    try {
      await adminAuthService.updateUserCredits(selectedUser.id, creditsValue);
      toast.success(`Credits updated for ${selectedUser.email}`);
      handleCloseDialog();
      fetchUsers(); // Refresh the list
    } catch (error) {
      console.error('Failed to update credits:', error);
      toast.error('Failed to update credits');
    }
  };

  const sortedUsers = [...users]
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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={{ xs: 2, md: 3 }} flexWrap="wrap" gap={1}>
        <Typography variant="h5" fontWeight={600} sx={{ fontSize: { xs: '1.2rem', md: '1.5rem' } }}>
          Users ({users.length})
        </Typography>
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

      <TableContainer component={Paper} elevation={2} sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: { xs: 800, md: 'auto' } }}>
          <TableHead sx={{ bgcolor: colorPalette.secondary.lightGreen }}>
            <TableRow>
              <TableCell sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' }, py: { xs: 1, md: 2 } }}>
                <TableSortLabel
                  active={orderBy === 'email'}
                  direction={orderBy === 'email' ? order : 'asc'}
                  onClick={() => handleSort('email')}
                >
                  Email
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' }, py: { xs: 1, md: 2 } }}>Name</TableCell>
              <TableCell align="right" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' }, py: { xs: 1, md: 2 } }}>
                <TableSortLabel
                  active={orderBy === 'credits'}
                  direction={orderBy === 'credits' ? order : 'asc'}
                  onClick={() => handleSort('credits')}
                >
                  Credits
                </TableSortLabel>
              </TableCell>
              <TableCell align="right" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' }, py: { xs: 1, md: 2 } }}>
                <TableSortLabel
                  active={orderBy === 'projects'}
                  direction={orderBy === 'projects' ? order : 'asc'}
                  onClick={() => handleSort('projects')}
                >
                  Projects
                </TableSortLabel>
              </TableCell>
              <TableCell align="right" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' }, py: { xs: 1, md: 2 } }}>
                <TableSortLabel
                  active={orderBy === 'tailorings'}
                  direction={orderBy === 'tailorings' ? order : 'asc'}
                  onClick={() => handleSort('tailorings')}
                >
                  Tailorings
                </TableSortLabel>
              </TableCell>
              <TableCell align="right" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' }, py: { xs: 1, md: 2 } }}>
                <TableSortLabel
                  active={orderBy === 'tokens_used'}
                  direction={orderBy === 'tokens_used' ? order : 'asc'}
                  onClick={() => handleSort('tokens_used')}
                >
                  Tokens
                </TableSortLabel>
              </TableCell>
              <TableCell align="right" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' }, py: { xs: 1, md: 2 } }}>Purchased</TableCell>
              <TableCell sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' }, py: { xs: 1, md: 2 } }}>Joined</TableCell>
              <TableCell sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' }, py: { xs: 1, md: 2 } }}>Last Active</TableCell>
              <TableCell align="center" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' }, py: { xs: 1, md: 2 } }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedUsers.map((user) => (
              <TableRow key={user.id} hover>
                <TableCell sx={{ fontSize: { xs: '0.7rem', md: '0.875rem' }, py: { xs: 0.5, md: 1.5 } }}>
                  <Typography variant="body2" fontWeight={500} sx={{ fontSize: { xs: '0.7rem', md: '0.875rem' } }}>
                    {user.email}
                  </Typography>
                </TableCell>
                <TableCell sx={{ fontSize: { xs: '0.7rem', md: '0.875rem' }, py: { xs: 0.5, md: 1.5 } }}>{user.full_name}</TableCell>
                <TableCell align="right" sx={{ py: { xs: 0.5, md: 1.5 } }}>
                  <Chip
                    label={user.credits.toFixed(1)}
                    size="small"
                    color={user.credits < 10 ? 'error' : 'success'}
                    sx={{ fontSize: { xs: '0.65rem', md: '0.8125rem' }, height: { xs: 20, md: 24 } }}
                  />
                </TableCell>
                <TableCell align="right" sx={{ fontSize: { xs: '0.7rem', md: '0.875rem' }, py: { xs: 0.5, md: 1.5 } }}>{user.projects}</TableCell>
                <TableCell align="right" sx={{ fontSize: { xs: '0.7rem', md: '0.875rem' }, py: { xs: 0.5, md: 1.5 } }}>{user.tailorings}</TableCell>
                <TableCell align="right" sx={{ fontSize: { xs: '0.7rem', md: '0.875rem' }, py: { xs: 0.5, md: 1.5 } }}>{user.tokens_used.toLocaleString()}</TableCell>
                <TableCell align="right" sx={{ fontSize: { xs: '0.7rem', md: '0.875rem' }, py: { xs: 0.5, md: 1.5 } }}>${(user.credits_purchased * 0.10).toFixed(2)}</TableCell>
                <TableCell sx={{ py: { xs: 0.5, md: 1.5 } }}>
                  <Typography variant="caption" sx={{ fontSize: { xs: '0.65rem', md: '0.75rem' } }}>
                    {new Date(user.created_at).toLocaleDateString()}
                  </Typography>
                </TableCell>
                <TableCell sx={{ py: { xs: 0.5, md: 1.5 } }}>
                  <Typography variant="caption" sx={{ fontSize: { xs: '0.65rem', md: '0.75rem' } }}>
                    {user.last_activity
                      ? new Date(user.last_activity).toLocaleDateString()
                      : 'Never'}
                  </Typography>
                </TableCell>
                <TableCell align="center" sx={{ py: { xs: 0.5, md: 1.5 } }}>
                  <IconButton
                    size="small"
                    onClick={() => handleEditClick(user)}
                    sx={{
                      color: colorPalette.primary.brightGreen,
                      '&:hover': {
                        bgcolor: colorPalette.secondary.lightGreen,
                      },
                      p: { xs: 0.5, md: 1 },
                    }}
                  >
                    <EditIcon sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Edit Credits Dialog */}
      <Dialog open={editDialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Edit Credits for {selectedUser?.email}
        </DialogTitle>
        <DialogContent>
          <Box pt={2}>
            <TextField
              label="Credits"
              type="number"
              fullWidth
              value={newCredits}
              onChange={(e) => setNewCredits(e.target.value)}
              inputProps={{ min: 0, step: 0.1 }}
              helperText="Enter the new credit balance for this user"
            />
            {selectedUser && (
              <Box mt={2}>
                <Typography variant="body2" color="text.secondary">
                  Current: <strong>{selectedUser.credits.toFixed(1)}</strong> credits
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  User: <strong>{selectedUser.full_name}</strong>
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSaveCredits}
            variant="contained"
            sx={{
              bgcolor: colorPalette.primary.brightGreen,
              '&:hover': {
                bgcolor: colorPalette.primary.darkGreen,
              },
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UsersDetailedView;
