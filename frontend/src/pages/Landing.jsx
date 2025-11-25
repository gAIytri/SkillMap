import { useState } from 'react';
import { Box, Container, Typography, Button, Grid, Card, CardContent, useTheme, useMediaQuery, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { colorPalette } from '../styles/theme';
import DescriptionIcon from '@mui/icons-material/Description';
import EditIcon from '@mui/icons-material/Edit';
import DownloadIcon from '@mui/icons-material/Download';
import FolderIcon from '@mui/icons-material/Folder';
import StarIcon from '@mui/icons-material/Star';
import LoginForm from '../components/auth/LoginForm';
import SignupForm from '../components/auth/SignupForm';

const Landing = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const [authMode, setAuthMode] = useState(null); // null, 'login', or 'signup'

  const features = [
    {
      icon: <DescriptionIcon sx={{ fontSize: 50, color: colorPalette.primary.brightGreen }} />,
      title: 'Upload Any Resume Format',
      description: 'Upload DOCX, PDF, or Images (JPG, PNG). Our AI extracts all content automatically.',
    },
    {
      icon: <EditIcon sx={{ fontSize: 50, color: colorPalette.primary.brightGreen }} />,
      title: 'AI-Powered Tailoring',
      description: 'Paste a job description and let AI tailor your resume, cover letter, and email automatically.',
    },
    {
      icon: <FolderIcon sx={{ fontSize: 50, color: colorPalette.primary.brightGreen }} />,
      title: 'Manage Projects',
      description: 'Keep all your tailored resumes organized in one place with version history.',
    },
    {
      icon: <DownloadIcon sx={{ fontSize: 50, color: colorPalette.primary.brightGreen }} />,
      title: 'Download PDF or DOCX',
      description: 'Get your tailored resume in PDF or DOCX format - your choice, instantly generated.',
    },
  ];

  return (
    <Box>
      {/* Hero Section or Auth Forms */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${colorPalette.secondary.lightGreen} 0%, ${colorPalette.background.default} 100%)`,
          py: isMobile ? 6 : isTablet ? 8 : 12,
          minHeight: authMode ? 'auto' : '70vh',
          display: 'flex',
          alignItems: authMode ? 'flex-start' : 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <Container maxWidth="lg" sx={{ position: 'relative', width: '100%', minHeight: authMode ? '500px' : '0' }}>
          {/* Hero Section - Show when authMode is null */}
          <Box
            sx={{
              display: authMode === null ? 'block' : 'none',
              opacity: authMode === null ? 1 : 0,
              transition: 'opacity 0.5s ease-in-out',
            }}
          >
            <Box
              textAlign="center"
              mb={isMobile ? 4 : 6}
              px={isMobile ? 2 : 0}
            >
              <Typography
                variant={isMobile ? 'h4' : isTablet ? 'h3' : 'h2'}
                component="h1"
                fontWeight={700}
                color={colorPalette.primary.darkGreen}
                gutterBottom
              >
                Tailor Your Resume
                <br />
                For Every Job
              </Typography>
              <Typography
                variant={isMobile ? 'body1' : 'h6'}
                color="text.secondary"
                maxWidth="700px"
                mx="auto"
                mb={2}
              >
                Upload any resume format (DOCX, PDF, Images), let AI tailor it for each job,
                and download as PDF or DOCX. Land more interviews with personalized resumes,
                cover letters, and emails.
              </Typography>

              {/* Sign up incentive - Only show if NOT logged in */}
              {!isAuthenticated && (
                <Box display="flex" justifyContent="center" mb={3}>
                  <Chip
                    icon={<StarIcon sx={{ color: '#FFD700 !important' }} />}
                    label="Sign up and get 100 FREE credits to start!"
                    sx={{
                      bgcolor: colorPalette.primary.darkGreen,
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: isMobile ? '0.875rem' : '1rem',
                      py: isMobile ? 2 : 2.5,
                      px: isMobile ? 1 : 2,
                      '& .MuiChip-icon': {
                        color: '#FFD700',
                      },
                      boxShadow: '0 4px 12px rgba(7, 45, 31, 0.3)',
                    }}
                  />
                </Box>
              )}

              <Box display="flex" gap={isMobile ? 1 : 2} justifyContent="center" flexDirection={isMobile ? 'column' : 'row'} px={isMobile ? 2 : 0}>
                {isAuthenticated ? (
                  /* Show Dashboard button if logged in */
                  <Button
                    variant="contained"
                    size={isMobile ? 'medium' : 'large'}
                    onClick={() => navigate('/dashboard')}
                    sx={{
                      py: isMobile ? 1.5 : 2,
                      px: isMobile ? 3 : 4,
                      bgcolor: colorPalette.primary.brightGreen,
                      fontSize: isMobile ? '1rem' : '1.1rem',
                      '&:hover': {
                        bgcolor: colorPalette.secondary.mediumGreen,
                      },
                    }}
                  >
                    Go to Dashboard
                  </Button>
                ) : (
                  /* Show Sign Up and Login buttons if NOT logged in */
                  <>
                    <Button
                      variant="contained"
                      size={isMobile ? 'medium' : 'large'}
                      onClick={() => setAuthMode('signup')}
                      sx={{
                        py: isMobile ? 1.5 : 2,
                        px: isMobile ? 3 : 4,
                        bgcolor: colorPalette.primary.brightGreen,
                        fontSize: isMobile ? '1rem' : '1.1rem',
                        '&:hover': {
                          bgcolor: colorPalette.secondary.mediumGreen,
                        },
                      }}
                    >
                      Get Started Free
                    </Button>
                    <Button
                      variant="outlined"
                      size={isMobile ? 'medium' : 'large'}
                      onClick={() => setAuthMode('login')}
                      sx={{
                        py: isMobile ? 1.5 : 2,
                        px: isMobile ? 3 : 4,
                        borderColor: colorPalette.primary.darkGreen,
                        color: colorPalette.primary.darkGreen,
                        fontSize: isMobile ? '1rem' : '1.1rem',
                      }}
                    >
                      Login
                    </Button>
                  </>
                )}
              </Box>
            </Box>
          </Box>

          {/* Login Form - Show when authMode is 'login' */}
          <Box
            sx={{
              display: authMode === 'login' ? 'block' : 'none',
              opacity: authMode === 'login' ? 1 : 0,
              transition: 'opacity 0.5s ease-in-out',
            }}
          >
            <LoginForm
              onBack={() => setAuthMode(null)}
              onSwitchToSignup={() => setAuthMode('signup')}
            />
          </Box>

          {/* Signup Form - Show when authMode is 'signup' */}
          <Box
            sx={{
              display: authMode === 'signup' ? 'block' : 'none',
              opacity: authMode === 'signup' ? 1 : 0,
              transition: 'opacity 0.5s ease-in-out',
            }}
          >
            <SignupForm
              onBack={() => setAuthMode(null)}
              onSwitchToLogin={() => setAuthMode('login')}
            />
          </Box>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: isMobile ? 4 : 8, px: isMobile ? 2 : 3 }}>
        <Typography
          variant={isMobile ? 'h5' : 'h4'}
          textAlign="center"
          fontWeight={700}
          color={colorPalette.primary.darkGreen}
          mb={isMobile ? 3 : 6}
        >
          How It Works
        </Typography>
        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card
                sx={{
                  height: '100%',
                  textAlign: 'center',
                  p: 2,
                  transition: 'transform 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                  },
                }}
              >
                <CardContent>
                  <Box mb={2}>{feature.icon}</Box>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* CTA Section - Only show if NOT logged in */}
      {!isAuthenticated && (
        <Box
          sx={{
            bgcolor: colorPalette.primary.darkGreen,
            py: isMobile ? 4 : 8,
          }}
        >
          <Container maxWidth="md">
            <Box textAlign="center" px={isMobile ? 2 : 0}>
              <Typography
                variant={isMobile ? 'h5' : 'h4'}
                fontWeight={700}
                color="#FFFFFF"
                gutterBottom
              >
                Ready to Stand Out?
              </Typography>
              <Typography
                variant={isMobile ? 'body1' : 'h6'}
                color="rgba(255, 255, 255, 0.9)"
                mb={2}
              >
                Join thousands of job seekers who are tailoring their resumes and landing
                more interviews.
              </Typography>

              {/* Free credits incentive */}
              <Box display="flex" justifyContent="center" mb={3}>
                <Chip
                  icon={<StarIcon sx={{ color: '#FFD700 !important' }} />}
                  label="Get 100 FREE credits when you sign up!"
                  sx={{
                    bgcolor: 'rgba(255, 255, 255, 0.15)',
                    color: '#FFFFFF',
                    fontWeight: 600,
                    fontSize: isMobile ? '0.875rem' : '1rem',
                    py: isMobile ? 2 : 2.5,
                    px: isMobile ? 1 : 2,
                    '& .MuiChip-icon': {
                      color: '#FFD700',
                    },
                  }}
                />
              </Box>

              <Button
                variant="contained"
                size={isMobile ? 'medium' : 'large'}
                onClick={() => setAuthMode('signup')}
                sx={{
                  py: isMobile ? 1.5 : 2,
                  px: isMobile ? 3 : 4,
                  bgcolor: colorPalette.primary.brightGreen,
                  fontSize: isMobile ? '1rem' : '1.1rem',
                  '&:hover': {
                    bgcolor: colorPalette.secondary.mediumGreen,
                  },
                }}
              >
                Start Tailoring Now
              </Button>
            </Box>
          </Container>
        </Box>
      )}

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          bgcolor: '#000',
          color: '#fff',
          py: 4,
          mt: 'auto',
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            {/* About Section */}
            <Grid item xs={12} md={4}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                SkillMap
              </Typography>
              <Typography variant="body2" sx={{ color: '#bbb', lineHeight: 1.8 }}>
                AI-powered resume tailoring platform that helps you create perfect resumes for every job application.
              </Typography>
            </Grid>

            {/* Quick Links */}
            <Grid item xs={12} md={4}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Quick Links
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {!isAuthenticated && (
                  <>
                    <Typography
                      variant="body2"
                      sx={{ color: '#bbb', cursor: 'pointer', '&:hover': { color: colorPalette.primary.brightGreen } }}
                      onClick={() => {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        setTimeout(() => setAuthMode('login'), 300);
                      }}
                    >
                      Login
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: '#bbb', cursor: 'pointer', '&:hover': { color: colorPalette.primary.brightGreen } }}
                      onClick={() => {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        setTimeout(() => setAuthMode('signup'), 300);
                      }}
                    >
                      Sign Up
                    </Typography>
                  </>
                )}
                <Typography
                  variant="body2"
                  sx={{ color: '#bbb', cursor: 'pointer', '&:hover': { color: colorPalette.primary.brightGreen } }}
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                >
                  Back to Top
                </Typography>
              </Box>
            </Grid>

            {/* Contact */}
            <Grid item xs={12} md={4}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Contact
              </Typography>
              <Typography variant="body2" sx={{ color: '#bbb', lineHeight: 1.8 }}>
                Need help? Reach out to us at:
              </Typography>
              <Typography variant="body2" sx={{ color: colorPalette.primary.brightGreen, mt: 1 }}>
                support@skillmap.com
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
            }}
          >
            <Typography variant="body2" sx={{ color: '#888' }}>
              © {new Date().getFullYear()} SkillMap. All rights reserved.
            </Typography>
            <Box sx={{ display: 'flex', gap: 3 }}>
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
    </Box>
  );
};

export default Landing;
