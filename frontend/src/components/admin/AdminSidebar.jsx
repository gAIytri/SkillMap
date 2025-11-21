import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  IconButton,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import TokenIcon from '@mui/icons-material/Token';
import BarChartIcon from '@mui/icons-material/BarChart';
import MenuIcon from '@mui/icons-material/Menu';
import { colorPalette } from '../../styles/theme';

const drawerWidth = 240;

const menuItems = [
  { id: 'overview', label: 'Overview', icon: <DashboardIcon /> },
  { id: 'users', label: 'Users', icon: <PeopleIcon /> },
  { id: 'credits', label: 'Credits & Revenue', icon: <AttachMoneyIcon /> },
  { id: 'tokens', label: 'Token Usage', icon: <TokenIcon /> },
  { id: 'retention', label: 'Retention', icon: <BarChartIcon /> },
];

const AdminSidebar = ({ selectedTab, onTabChange, mobileOpen, onDrawerToggle }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const drawer = (
    <Box>
      <Toolbar
        sx={{
          bgcolor: colorPalette.primary.darkGreen,
          color: 'white',
          minHeight: { xs: 56, sm: 64 },
        }}
      >
        <Typography variant="h6" fontWeight={700} color='white' noWrap>
          Admin Panel
        </Typography>
      </Toolbar>
      <List sx={{ pt: 2 }}>
        {menuItems.map((item) => (
          <ListItem key={item.id} disablePadding>
            <ListItemButton
              selected={selectedTab === item.id}
              onClick={() => {
                onTabChange(item.id);
                if (isMobile) {
                  onDrawerToggle();
                }
              }}
              sx={{
                '&.Mui-selected': {
                  bgcolor: colorPalette.secondary.lightGreen,
                  borderLeft: `4px solid ${colorPalette.primary.brightGreen}`,
                  '&:hover': {
                    bgcolor: colorPalette.secondary.lightGreen,
                  },
                },
                '&:hover': {
                  bgcolor: colorPalette.background.paper,
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color:
                    selectedTab === item.id
                      ? colorPalette.primary.brightGreen
                      : 'inherit',
                  minWidth: 40,
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontWeight: selectedTab === item.id ? 600 : 400,
                  fontSize: '0.95rem',
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
    >
      {/* Mobile menu button */}
      {isMobile && (
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={onDrawerToggle}
          sx={{
            position: 'fixed',
            top: 16,
            left: 16,
            zIndex: 1300,
            bgcolor: colorPalette.primary.darkGreen,
            color: 'white',
            '&:hover': {
              bgcolor: colorPalette.primary.brightGreen,
            },
          }}
        >
          <MenuIcon />
        </IconButton>
      )}

      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
          },
        }}
      >
        {drawer}
      </Drawer>

      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
          },
        }}
        open
      >
        {drawer}
      </Drawer>
    </Box>
  );
};

export default AdminSidebar;
