import { useState, useEffect, useRef } from 'react';
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  Alert,
  CircularProgress,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Chip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
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
                Select Resume File
              </Button>
            </label>
          </Box>

          {selectedFile && !uploading && (
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

          {uploading && (
            <Box mb={3}>
              <LinearProgress
                sx={{
                  bgcolor: colorPalette.secondary.lightGreen,
                  '& .MuiLinearProgress-bar': {
                    bgcolor: colorPalette.primary.brightGreen,
                  },
                  mb: 2,
                }}
              />

              {/* Status messages */}
              {statusMessages.length > 0 && (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    maxHeight: 200,
                    overflow: 'auto',
                    bgcolor: '#f5f5f5',
                    textAlign: 'left',
                  }}
                >
                  <List dense>
                    {statusMessages.map((msg, idx) => (
                      <ListItem key={idx} disablePadding sx={{ py: 0.5 }}>
                        <CheckCircleIcon
                          sx={{
                            fontSize: 16,
                            color: colorPalette.primary.brightGreen,
                            mr: 1,
                          }}
                        />
                        <ListItemText
                          primary={msg}
                          primaryTypographyProps={{
                            variant: 'body2',
                            color: 'text.secondary',
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              )}

              {/* Show specific message for OCR */}
              {statusMessages.some(msg => msg.includes('OCR')) && (
                <Box mt={2}>
                  <Chip
                    label="Using OCR - This may take 5-10 seconds"
                    size="small"
                    sx={{
                      bgcolor: colorPalette.secondary.lightGreen,
                      color: colorPalette.primary.darkGreen,
                      fontWeight: 600,
                    }}
                  />
                </Box>
              )}
            </Box>
          )}

          {!uploading && (
            <Button
              variant="contained"
              size={isMobile ? 'medium' : 'large'}
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
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
          )}

          {uploading && (
            <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
              <CircularProgress size={20} />
              <Typography variant="body2" color="text.secondary">
                Processing...
              </Typography>
            </Box>
          )}

          <Box mt={4}>
            <Typography variant="caption" color="text.secondary">
              Max file size: 10MB • AI-powered extraction
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default UploadResume;
