import { useState, useEffect, useRef } from 'react';
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  Alert,
  LinearProgress,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { colorPalette } from '../styles/theme';
import resumeService from '../services/resumeService';

const UploadResume = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [statusMessages, setStatusMessages] = useState([]);
  const navigate = useNavigate();
  const abortControllerRef = useRef(null); // For cancelling requests
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Cleanup pending requests on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        console.log('Aborting pending upload on unmount');
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Supported file formats
  const SUPPORTED_FORMATS = {
    docx: ['.docx', '.doc'],
    pdf: ['.pdf'],
    image: ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif'],
  };

  const getAllowedExtensions = () => {
    return Object.values(SUPPORTED_FORMATS).flat().join(', ');
  };

  const isFileSupported = (filename) => {
    const lowerName = filename.toLowerCase();
    return Object.values(SUPPORTED_FORMATS)
      .flat()
      .some(ext => lowerName.endsWith(ext));
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];

    if (!file) return;

    // Validate file type
    if (!isFileSupported(file.name)) {
      setError(`Unsupported file format. Please upload one of: ${getAllowedExtensions()}`);
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setError('');
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError('');
    setStatusMessages([]);

    // Create new AbortController for this upload
    const uploadAbortController = new AbortController();
    abortControllerRef.current = uploadAbortController;

    try {
      // Upload with streaming progress updates and abort support
      const result = await resumeService.uploadResume(
        selectedFile,
        (message) => {
          // Handle status updates
          if (message.type === 'status') {
            setStatusMessages(prev => [...prev, message.message]);
          } else if (message.type === 'error') {
            throw new Error(message.message);
          }
        },
        uploadAbortController.signal // Pass abort signal
      );

      if (result && result.success) {
        // Navigate to dashboard on success
        navigate('/dashboard');
      } else {
        throw new Error('Upload completed but no data received');
      }
    } catch (err) {
      // Gracefully handle aborted uploads
      if (err.name === 'AbortError') {
        console.log('Upload was cancelled');
        return;
      }

      console.error('Upload error:', err);

      // Handle error properly
      let errorMessage = 'Failed to upload resume. Please try again.';

      if (err.message) {
        errorMessage = err.message;
      } else if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        if (typeof detail === 'string') {
          errorMessage = detail;
        } else if (Array.isArray(detail)) {
          errorMessage = detail.map(e => e.msg).join(', ');
        }
      }

      setError(errorMessage);
      setUploading(false);
    } finally {
      abortControllerRef.current = null; // Clean up controller
    }
  };

  return (
    <Container maxWidth="md">
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="calc(100vh - 64px)"
        py={isMobile ? 2 : 4}
        px={isMobile ? 2 : 0}
      >
        <Paper
          elevation={3}
          sx={{
            p: isMobile ? 3 : 6,
            width: '100%',
            borderRadius: 3,
            textAlign: 'center',
          }}
        >
          {/* Initial State - Before Upload */}
          {!uploading && (
            <>
              <CloudUploadIcon
                sx={{
                  fontSize: isMobile ? 60 : 80,
                  color: colorPalette.primary.brightGreen,
                  mb: 2,
                }}
              />

              <Typography
                variant={isMobile ? 'h5' : 'h4'}
                component="h1"
                gutterBottom
                fontWeight={700}
                color={colorPalette.primary.darkGreen}
              >
                Upload Your Base Resume
              </Typography>

              <Typography
                variant={isMobile ? 'body2' : 'body1'}
                color="text.secondary"
                mb={1}
                maxWidth="700px"
                mx="auto"
              >
                Upload your resume in DOCX, PDF, or image format. Our AI will extract the content
                and structure it for tailoring to different job applications.
              </Typography>

              <Box mb={4}>
                <Typography variant="caption" color="text.secondary">
                  <strong>Supported formats:</strong> {getAllowedExtensions()}
                </Typography>
              </Box>

              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}

              <Box mb={4}>
                <input
                  accept={getAllowedExtensions()}
                  style={{ display: 'none' }}
                  id="resume-file-input"
                  type="file"
                  onChange={handleFileSelect}
                  disabled={uploading}
                />
                <label htmlFor="resume-file-input">
                  <Button
                    variant="outlined"
                    component="span"
                    size={isMobile ? 'medium' : 'large'}
                    disabled={uploading}
                    fullWidth={isMobile}
                    sx={{
                      py: isMobile ? 1.5 : 2,
                      px: isMobile ? 3 : 4,
                      borderColor: colorPalette.primary.darkGreen,
                      color: colorPalette.primary.darkGreen,
                      borderWidth: 2,
                      '&:hover': {
                        borderWidth: 2,
                        borderColor: colorPalette.primary.brightGreen,
                        bgcolor: colorPalette.secondary.lightGreen,
                      },
                    }}
                  >
                    {selectedFile ? 'Replace Resume' : 'Select Resume File'}
                  </Button>
                </label>
              </Box>

              {selectedFile && (
                <Box mb={3}>
                  <Typography variant="body2" color="text.secondary" mb={1}>
                    Selected file:
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {selectedFile.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </Typography>
                </Box>
              )}

              <Button
                variant="contained"
                size={isMobile ? 'medium' : 'large'}
                onClick={handleUpload}
                disabled={!selectedFile}
                fullWidth={isMobile}
                sx={{
                  py: isMobile ? 1.5 : 1.5,
                  px: isMobile ? 3 : 4,
                  bgcolor: colorPalette.primary.brightGreen,
                  '&:hover': {
                    bgcolor: colorPalette.secondary.mediumGreen,
                  },
                }}
              >
                Upload & Extract
              </Button>

              <Box mt={4}>
                <Typography variant="caption" color="text.secondary">
                  Max file size: 10MB • AI-powered extraction
                </Typography>
              </Box>
            </>
          )}

          {/* During Upload State - Show Progress, Status, and Template */}
          {uploading && (
            <Box>
              {/* Uploading text and progress bar at top */}
              <Typography
                variant={isMobile ? 'body2' : 'body1'}
                fontWeight={600}
                color={colorPalette.primary.darkGreen}
                mb={isMobile ? 1.5 : 2}
              >
                Uploading...
              </Typography>

              <LinearProgress
                sx={{
                  bgcolor: colorPalette.secondary.lightGreen,
                  '& .MuiLinearProgress-bar': {
                    bgcolor: colorPalette.primary.brightGreen,
                  },
                  mb: isMobile ? 3 : 4,
                  height: isMobile ? 4 : 6,
                }}
              />

              {/* Template Preview - Centered, full width */}
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                maxWidth={isMobile ? '100%' : '600px'}
                mx="auto"
                px={isMobile ? 0 : 2}
              >
                <Typography
                  variant={isMobile ? 'caption' : 'body2'}
                  fontWeight={600}
                  color={colorPalette.primary.darkGreen}
                  mb={isMobile ? 1.5 : 2}
                  textAlign="center"
                >
                  Your resume will look like this:
                </Typography>

                <Paper
                  elevation={3}
                  sx={{
                    width: '100%',
                    overflow: 'hidden',
                    border: isMobile ? '1.5px solid' : '2px solid',
                    borderColor: colorPalette.primary.brightGreen,
                    borderRadius: isMobile ? 1.5 : 2,
                  }}
                >
                  <img
                    src="/src/assets/resume-template-preview.png"
                    alt="Resume Template Preview"
                    style={{
                      width: '100%',
                      height: 'auto',
                      display: 'block',
                    }}
                    onError={(e) => {
                      // Fallback if image not found
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  {/* Fallback placeholder */}
                  <Box
                    sx={{
                      display: 'none',
                      width: '100%',
                      aspectRatio: '8.5 / 11',
                      bgcolor: '#f5f5f5',
                      alignItems: 'center',
                      justifyContent: 'center',
                      p: isMobile ? 2 : 3,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" textAlign="center">
                      Clean, ATS-friendly format
                    </Typography>
                  </Box>
                </Paper>

                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                  mt={isMobile ? 1 : 2}
                  textAlign="center"
                  fontStyle="italic"
                  sx={{ fontSize: isMobile ? '0.7rem' : '0.75rem' }}
                >
                  Clean, professional, ATS-friendly format
                </Typography>
              </Box>
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default UploadResume;
