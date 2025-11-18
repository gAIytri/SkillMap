import { Box, Container, Typography, Button, Grid, Card, CardContent, useTheme, useMediaQuery, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { colorPalette } from '../styles/theme';
import DescriptionIcon from '@mui/icons-material/Description';
import EditIcon from '@mui/icons-material/Edit';
import DownloadIcon from '@mui/icons-material/Download';
import FolderIcon from '@mui/icons-material/Folder';
import StarIcon from '@mui/icons-material/Star';

const Landing = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

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
      {/* Hero Section */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${colorPalette.secondary.lightGreen} 0%, ${colorPalette.background.default} 100%)`,
          py: isMobile ? 6 : isTablet ? 8 : 12,
        }}
      >
        <Container maxWidth="lg">
          <Box textAlign="center" mb={isMobile ? 4 : 6} px={isMobile ? 2 : 0}>
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
                    onClick={() => navigate('/register')}
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
                    onClick={() => navigate('/login')}
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
                onClick={() => navigate('/register')}
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
    </Box>
  );
};

export default Landing;
