import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  IconButton,
  Divider,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DownloadIcon from '@mui/icons-material/Download';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { colorPalette } from '../styles/theme';
import resumeService from '../services/resumeService';

const ResumeViewer = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [latexContent, setLatexContent] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(true);

  useEffect(() => {
    const loadResume = async () => {
      try {
        // If coming from upload, use state data
        if (location.state?.latex_content) {
          setLatexContent(location.state.latex_content);
          setLoading(false);
          // Load PDF preview
          await loadPdfPreview();
        } else {
          // Otherwise fetch base resume
          const resume = await resumeService.getBaseResume();
          setLatexContent(resume.latex_content);
          setLoading(false);
          // Load PDF preview
          await loadPdfPreview();
        }
      } catch (err) {
        setError('Failed to load resume. Please try uploading again.');
        setLoading(false);
      }
    };

    loadResume();
  }, [location]);

  const loadPdfPreview = async () => {
    try {
      setPdfLoading(true);
      const pdfBlob = await resumeService.downloadBaseResumePDF();
      const url = window.URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
      setPdfLoading(false);
    } catch (err) {
      console.error('Failed to load PDF preview:', err);
      setPdfLoading(false);
    }
  };

  // Cleanup PDF URL on unmount
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        window.URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const pdfBlob = await resumeService.downloadBaseResumePDF();

      // Create download link
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'base_resume.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('PDF downloaded successfully!');
    } catch (err) {
      toast.error('Failed to download PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handleContinue = () => {
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="calc(100vh - 64px)"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="calc(100vh - 64px)"
        p={4}
      >
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={() => navigate('/upload-resume')}>
          Upload Resume
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      {/* Compact Header Bar - Max 100px */}
      <Box
        sx={{
          minHeight: '0px',
          maxHeight: '70px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 3,
          py: 1.5,
          borderBottom: '1px solid #E0E0E0',
          bgcolor: '#FAFAFA',
        }}
      >
        {/* Left: Back button and Project Info */}
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton
            onClick={() => navigate('/dashboard')}
            sx={{
              bgcolor: '#FFF',
              border: '1px solid #E0E0E0',
              '&:hover': { bgcolor: '#F5F5F5' },
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5 }}>
              Base Resume
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Last updated: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
            </Typography>
          </Box>
        </Box>

        {/* Right: Action Buttons */}
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadPDF}
            disabled={downloading}
            sx={{
              borderColor: colorPalette.primary.darkGreen,
              color: colorPalette.primary.darkGreen,
              textTransform: 'none',
              px: 3,
            }}
          >
            {downloading ? 'Downloading...' : 'Download PDF'}
          </Button>
          {location.state?.isNew && (
            <Button
              variant="contained"
              startIcon={<CheckCircleIcon />}
              onClick={handleContinue}
              sx={{
                bgcolor: colorPalette.primary.brightGreen,
                textTransform: 'none',
                px: 3,
                '&:hover': {
                  bgcolor: colorPalette.secondary.mediumGreen,
                },
              }}
            >
              Looks Good, Continue
            </Button>
          )}
        </Box>
      </Box>

      {/* 3-Column Layout */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left: Job Description Panel - Fixed 300px */}
        <Box
          sx={{
            width: '300px',
            borderRight: '2px solid #D0D0D0',
            bgcolor: '#F9F9F9',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              p: 2,
              borderBottom: '1px solid #E0E0E0',
              bgcolor: colorPalette.secondary.lightGreen,
            }}
          >
            <Typography variant="subtitle1" fontWeight={600}>
              Job Description
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Tailor your resume for this role
            </Typography>
          </Box>
          <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
            <Typography variant="body2" color="text.secondary" paragraph>
              Upload a job description to tailor your resume specifically for that role.
            </Typography>
            <Button
              variant="outlined"
              size="small"
              fullWidth
              sx={{
                textTransform: 'none',
                borderColor: colorPalette.primary.darkGreen,
                color: colorPalette.primary.darkGreen,
              }}
            >
              Add Job Description
            </Button>
          </Box>
        </Box>

        {/* Middle: LaTeX Editor - Flex */}
        <Box
          sx={{
            flex: 1,
            borderRight: '1px solid #D0D0D0',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              p: 1.5,
              borderBottom: '1px solid #E0E0E0',
              bgcolor: '#F5F5F5',
            }}
          >
            <Typography variant="subtitle2" fontWeight={600}>
              LaTeX Editor
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Edit your resume content in LaTeX format
            </Typography>
          </Box>
          <Box
            sx={{
              flex: 1,
              overflow: 'auto',
              bgcolor: '#F8F8F8',
              display: 'flex',
            }}
          >
            {/* Line Numbers */}
            <Box
              sx={{
                bgcolor: '#ECECEC',
                p: 2,
                pr: 1,
                borderRight: '1px solid #D0D0D0',
                minWidth: '50px',
                textAlign: 'right',
              }}
            >
              <pre
                style={{
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  margin: 0,
                  color: '#999',
                  userSelect: 'none',
                }}
              >
                {latexContent.split('\n').map((_, i) => `${i + 1}\n`).join('')}
              </pre>
            </Box>
            {/* LaTeX Code */}
            <Box sx={{ flex: 1, p: 2, overflow: 'auto' }}>
              <pre
                style={{
                  fontFamily: '"Courier New", Courier, monospace',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word',
                  margin: 0,
                  color: '#333',
                }}
              >
                {latexContent}
              </pre>
            </Box>
          </Box>
        </Box>

        {/* Right: PDF Preview - Flex */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              p: 1.5,
              borderBottom: '1px solid #E0E0E0',
              bgcolor: '#F5F5F5',
            }}
          >
            <Typography variant="subtitle2" fontWeight={600}>
              PDF Preview
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Real-time preview of your tailored resume
            </Typography>
          </Box>
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              bgcolor: '#525659',
              overflow: 'hidden',
            }}
          >
            {pdfLoading ? (
              <Box textAlign="center">
                <CircularProgress sx={{ color: '#FFF' }} />
                <Typography variant="body2" color="#FFF" mt={2}>
                  Generating PDF preview...
                </Typography>
              </Box>
            ) : pdfUrl ? (
              <iframe
                src={pdfUrl}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  backgroundColor: '#FFF',
                }}
                title="Resume PDF Preview"
              />
            ) : (
              <Paper
                elevation={3}
                sx={{
                  p: 4,
                  maxWidth: '400px',
                  textAlign: 'center',
                }}
              >
                <Typography variant="body2" color="error">
                  Failed to load PDF preview
                </Typography>
                <Button
                  variant="outlined"
                  onClick={loadPdfPreview}
                  sx={{ mt: 2 }}
                >
                  Retry
                </Button>
              </Paper>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default ResumeViewer;
