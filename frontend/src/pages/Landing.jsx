import { useState, useRef, useEffect } from 'react';
import { Box, Container, Typography, Button, Grid, Card, CardContent, useTheme, useMediaQuery, Chip } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { colorPalette } from '../styles/theme';
import DescriptionIcon from '@mui/icons-material/Description';
import EditIcon from '@mui/icons-material/Edit';
import DownloadIcon from '@mui/icons-material/Download';
import FolderIcon from '@mui/icons-material/Folder';
import StarIcon from '@mui/icons-material/Star';
import LoginForm from '../components/auth/LoginForm';
import SignupForm from '../components/auth/SignupForm';
import ForgotPassword from '../components/auth/ForgotPassword';
import Footer from '../components/common/Footer';

const Landing = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const [authMode, setAuthMode] = useState(null); // null, 'login', or 'signup'
  const topRef = useRef(null);

  // Check if we should show login form (e.g., after password reset)
  useEffect(() => {
    if (location.state?.showLogin) {
      setAuthMode('login');
      // Clear the state to avoid re-triggering on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const scrollToTop = () => {
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const features = [
    {
      icon: <DescriptionIcon sx={{ fontSize: 50, color: colorPalette.primary.brightGreen }} />,
      title: 'Upload Any Resume Format',
      description: 'Upload DOCX or PDF file . Our AI extracts all content automatically.',
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
    <Box ref={topRef}>
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
                    
                    label="Sign up and get 100 FREE CREDITS to start!"
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
                  /* Show "Upload Resume" if no base resume, otherwise "Go to Dashboard" */
                  <Button
                    variant="contained"
                    size={isMobile ? 'medium' : 'large'}
                    onClick={() => navigate(user?.base_resume_id ? '/dashboard' : '/upload-resume')}
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
                    {user?.base_resume_id ? 'Go to Dashboard' : 'Upload Resume'}
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
              onSwitchToForgotPassword={() => setAuthMode('forgot-password')}
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

          {/* Forgot Password Form - Show when authMode is 'forgot-password' */}
          <Box
            sx={{
              display: authMode === 'forgot-password' ? 'block' : 'none',
              opacity: authMode === 'forgot-password' ? 1 : 0,
              transition: 'opacity 0.5s ease-in-out',
            }}
          >
            <ForgotPassword
              onBack={() => setAuthMode('login')}
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
                 
                  label="Get 100 FREE CREDITS when you sign up!"
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
                onClick={() => {
                  setAuthMode('signup');
                  setTimeout(() => {
                    scrollToTop();
                  }, 100);
                }}
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
      <Footer scrollToTop={scrollToTop} setAuthMode={setAuthMode} />
    </Box>
  );
};

export default Landing;
