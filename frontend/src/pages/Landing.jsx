import { Box, Container, Typography, Button, Grid, Card, CardContent } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { colorPalette } from '../styles/theme';
import DescriptionIcon from '@mui/icons-material/Description';
import EditIcon from '@mui/icons-material/Edit';
import DownloadIcon from '@mui/icons-material/Download';
import FolderIcon from '@mui/icons-material/Folder';

const Landing = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <DescriptionIcon sx={{ fontSize: 50, color: colorPalette.primary.brightGreen }} />,
      title: 'Upload Your Resume',
      description: 'Upload your resume in DOCX format. We extract styling and convert to LaTeX.',
    },
    {
      icon: <EditIcon sx={{ fontSize: 50, color: colorPalette.primary.brightGreen }} />,
      title: 'Tailor for Each Job',
      description: 'Edit and customize your resume for different job applications with ease.',
    },
    {
      icon: <FolderIcon sx={{ fontSize: 50, color: colorPalette.primary.brightGreen }} />,
      title: 'Manage Projects',
      description: 'Keep all your tailored resumes organized in one place.',
    },
    {
      icon: <DownloadIcon sx={{ fontSize: 50, color: colorPalette.primary.brightGreen }} />,
      title: 'Download as PDF',
      description: 'Generate professional PDFs instantly from your tailored resumes.',
    },
  ];

  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${colorPalette.secondary.lightGreen} 0%, ${colorPalette.background.default} 100%)`,
          py: 12,
        }}
      >
        <Container maxWidth="lg">
          <Box textAlign="center" mb={6}>
            <Typography
              variant="h2"
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
              variant="h6"
              color="text.secondary"
              maxWidth="700px"
              mx="auto"
              mb={4}
            >
              Stop sending the same resume to every job. Upload once, tailor for each
              application, and land more interviews.
            </Typography>
            <Box display="flex" gap={2} justifyContent="center">
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/register')}
                sx={{
                  py: 2,
                  px: 4,
                  bgcolor: colorPalette.primary.brightGreen,
                  fontSize: '1.1rem',
                  '&:hover': {
                    bgcolor: colorPalette.secondary.mediumGreen,
                  },
                }}
              >
                Get Started Free
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => navigate('/login')}
                sx={{
                  py: 2,
                  px: 4,
                  borderColor: colorPalette.primary.darkGreen,
                  color: colorPalette.primary.darkGreen,
                  fontSize: '1.1rem',
                }}
              >
                Login
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography
          variant="h4"
          textAlign="center"
          fontWeight={700}
          color={colorPalette.primary.darkGreen}
          mb={6}
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

      {/* CTA Section */}
      <Box
        sx={{
          bgcolor: colorPalette.primary.darkGreen,
          py: 8,
        }}
      >
        <Container maxWidth="md">
          <Box textAlign="center">
            <Typography
              variant="h4"
              fontWeight={700}
              color="#FFFFFF"
              gutterBottom
            >
              Ready to Stand Out?
            </Typography>
            <Typography
              variant="h6"
              color="rgba(255, 255, 255, 0.9)"
              mb={4}
            >
              Join thousands of job seekers who are tailoring their resumes and landing
              more interviews.
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/register')}
              sx={{
                py: 2,
                px: 4,
                bgcolor: colorPalette.primary.brightGreen,
                fontSize: '1.1rem',
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
    </Box>
  );
};

export default Landing;
