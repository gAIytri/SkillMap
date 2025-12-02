import { Box, Container, Grid, Typography, IconButton, useTheme, useMediaQuery } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { colorPalette } from '../../styles/theme';
import ArrowUpIcon from '../icons/ArrowUpIcon';

const Footer = ({ scrollToTop, setAuthMode }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box
      component="footer"
      sx={{
        bgcolor: '#000',
        color: '#fff',
        py: 4,
        mt: 'auto',
        position: 'relative',
      }}
    >
      {/* Back to Top Icon Button - Top Right of Footer */}
      <IconButton
        onClick={scrollToTop}
        sx={{
          position: 'absolute',
          top: { xs: 10, md: 20 },
          right: { xs: 20, md: 400 },
          bgcolor: colorPalette.primary.darkGreen,
          color: '#fff',
          border: `2px solid ${colorPalette.primary.brightGreen}`,
          width: { xs: '50px', md: '56px' },
          height: { xs: '50px', md: '56px' },
          boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)',
          '&:hover': {
            bgcolor: colorPalette.primary.brightGreen,
            borderColor: '#fff',
            transform: 'translateY(-4px)',
            boxShadow: '0 6px 20px rgba(76, 175, 80, 0.5)',
          },
          transition: 'all 0.3s ease',
          zIndex: 10,
        }}
      >
        <ArrowUpIcon size={28} color="#fff" />
      </IconButton>

      <Container maxWidth="lg">
        <Grid container spacing={4}>
          {/* About Section */}
          <Grid item xs={12} md={4}>
            <Typography variant="h6" fontWeight={700} gutterBottom sx={{ color: colorPalette.primary.brightGreen }}>
              SkillMap
            </Typography>
            <Typography variant="body2" sx={{ color: '#bbb', lineHeight: 1.8 }}>
              AI-powered resume tailoring platform that helps you create perfect resumes for every job application.
            </Typography>
          </Grid>

          {/* Quick Links */}
          <Grid item xs={12} md={4}>
            <Typography variant="h6" fontWeight={700} gutterBottom sx={{ color: colorPalette.primary.brightGreen }}>
              Quick Links
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {!isAuthenticated ? (
                <>
                  <Typography
                    variant="body2"
                    sx={{ color: '#bbb', cursor: 'pointer', '&:hover': { color: colorPalette.primary.brightGreen } }}
                    onClick={() => {
                      setAuthMode('login');
                      setTimeout(() => {
                        scrollToTop();
                      }, 100);
                    }}
                  >
                    Login
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: '#bbb', cursor: 'pointer', '&:hover': { color: colorPalette.primary.brightGreen } }}
                    onClick={() => {
                      setAuthMode('signup');
                      setTimeout(() => {
                        scrollToTop();
                      }, 100);
                    }}
                  >
                    Sign Up
                  </Typography>
                </>
              ) : (
                <Typography
                  variant="body2"
                  sx={{ color: '#bbb', cursor: 'pointer', '&:hover': { color: colorPalette.primary.brightGreen } }}
                  onClick={() => navigate('/dashboard')}
                >
                  Projects
                </Typography>
              )}
            </Box>
          </Grid>

          {/* Contact */}
          <Grid item xs={12} md={4}>
            <Typography variant="h6" fontWeight={700} gutterBottom sx={{ color: colorPalette.primary.brightGreen }}>
              Contact
            </Typography>
            <Typography variant="body2" sx={{ color: '#bbb', lineHeight: 1.8 }}>
              Need help? Reach out to us at:
            </Typography>
            <Typography
              component="a"
              href="mailto:admin@gaiytri.com"
              variant="body2"
              sx={{
                color: colorPalette.primary.brightGreen,
                mt: 1,
                display: 'block',
                textDecoration: 'none',
                cursor: 'pointer',
                '&:hover': {
                  textDecoration: 'underline',
                },
              }}
            >
              admin@gaiytri.com
            </Typography>
          </Grid>
        </Grid>

        {/* Bottom Bar */}
        <Box
          sx={{
            borderTop: '1px solid #333',
            mt: 4,
            pt: 3,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexDirection: isMobile ? 'column' : 'row',
            gap: 2,
            position: 'relative',
          }}
        >
          <Typography variant="body2" sx={{ color: '#888' }}>
            © {new Date().getFullYear()} SkillMap. All rights reserved.
          </Typography>
          <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
            <Typography
              variant="body2"
              sx={{ color: '#888', cursor: 'pointer', '&:hover': { color: '#fff' } }}
            >
              Privacy Policy
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: '#888', cursor: 'pointer', '&:hover': { color: '#fff' } }}
            >
              Terms of Service
            </Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
