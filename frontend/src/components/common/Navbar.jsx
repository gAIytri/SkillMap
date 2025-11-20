import { AppBar, Toolbar, Typography, Button, Box, Avatar, IconButton, Menu, MenuItem, Chip, useTheme, useMediaQuery } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';
import { colorPalette } from '../../styles/theme';
import faviconSvg from '../../assets/favicon.svg';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down(400));

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleClose();
    navigate('/login');
  };

  return (
    <AppBar
      position="static"
      elevation={1}
      sx={{
        background: 'linear-gradient(135deg, #072D1F 0%, #29B770 100%)',
        minHeight: '48px',
      }}
    >
      <Toolbar sx={{ minHeight: '48px !important', py: 0.5 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexGrow: 1,
            cursor: 'pointer',
          }}
          onClick={() => navigate('/')}
        >
          <img
            src={faviconSvg}
            alt="SkillMap Logo"
            style={{ width: '28px', height: '28px' }}
          />
          <Typography
            variant="h6"
            component="div"
            sx={{
              fontWeight: 700,
              color: '#ffffff',
              fontSize: '1.1rem',
            }}
          >
            SkillMap
          </Typography>
        </Box>

        {isAuthenticated && user ? (
          <Box display="flex" alignItems="center" gap={isMobile ? 1 : 2}>
            <Button
              color="inherit"
              onClick={() => navigate('/dashboard')}
              size={isMobile ? 'small' : 'medium'}
              sx={{
                color: '#ffffff',
                fontSize: isMobile ? '0.75rem' : '0.875rem',
                px: isMobile ? 1 : 2,
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                },
              }}
            >
              Projects
            </Button>
            {!isSmallMobile && (
              <Chip
                icon={<AccountBalanceWalletIcon sx={{ color: '#ffffff !important', fontSize: isMobile ? 16 : 20 }} />}
                label={`${user.credits?.toFixed(1) || '0.0'} ${isMobile ? '' : 'Credits'}`}
                size={isMobile ? 'small' : 'medium'}
                onClick={() => navigate('/profile')}
                sx={{
                  bgcolor: 'rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: isMobile ? '0.75rem' : '0.875rem',
                  cursor: 'pointer',
                  '& .MuiChip-icon': {
                    color: '#ffffff',
                  },
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.25)',
                  },
                }}
              />
            )}
            <IconButton onClick={handleMenu} sx={{ p: 0 }}>
              <Avatar
                alt={user?.full_name}
                src={user?.profile_picture_url}
                sx={{
                  bgcolor: colorPalette.primary.brightGreen,
                  width: isMobile ? 32 : 40,
                  height: isMobile ? 32 : 40,
                }}
              >
                {user?.full_name?.charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
            >
              <MenuItem disabled>
                <Typography variant="body2">{user?.email}</Typography>
              </MenuItem>
              <MenuItem
                onClick={() => {
                  navigate('/profile');
                  handleClose();
                }}
              >
                Profile
              </MenuItem>
              <MenuItem onClick={handleLogout}>Logout</MenuItem>
            </Menu>
          </Box>
        ) : (
          <Box display="flex" gap={isMobile ? 0.5 : 2}>
            <Button
              variant="outlined"
              onClick={() => navigate('/login')}
              size={isMobile ? 'small' : 'medium'}
              sx={{
                borderColor: '#ffffff',
                color: '#ffffff',
                fontSize: isMobile ? '0.75rem' : '0.875rem',
                px: isMobile ? 1.5 : 2,
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                  borderColor: '#ffffff',
                },
              }}
            >
              Login
            </Button>
            <Button
              variant="contained"
              onClick={() => navigate('/register')}
              size={isMobile ? 'small' : 'medium'}
              sx={{
                bgcolor: '#ffffff',
                color: '#072D1F',
                fontSize: isMobile ? '0.75rem' : '0.875rem',
                px: isMobile ? 1.5 : 2,
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.9)',
                },
              }}
            >
              Sign Up
            </Button>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
