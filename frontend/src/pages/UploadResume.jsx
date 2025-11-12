import { useState } from 'react';
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  Alert,
  CircularProgress,
  LinearProgress,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { colorPalette } from '../styles/theme';
import resumeService from '../services/resumeService';

const UploadResume = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleFileSelect = (event) => {
    const file = event.target.files[0];

    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.docx')) {
      setError('Please upload a .docx file only');
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

    try {
      // Upload and convert DOCX to LaTeX
      const convertedData = await resumeService.uploadResume(selectedFile);

      // Save as base resume
      await resumeService.saveBaseResume({
        latex_content: convertedData.latex_content,
        doc_metadata: convertedData.metadata,
        original_filename: selectedFile.name,
      });

      // Navigate directly to dashboard
      navigate('/dashboard');
    } catch (err) {
      // Handle error properly - could be string or object
      let errorMessage = 'Failed to upload resume. Please try again.';

      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        if (typeof detail === 'string') {
          errorMessage = detail;
        } else if (Array.isArray(detail)) {
          // Pydantic validation errors
          errorMessage = detail.map(e => e.msg).join(', ');
        } else if (typeof detail === 'object') {
          errorMessage = JSON.stringify(detail);
        }
      }

      setError(errorMessage);
    } finally {
      setUploading(false);
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
        py={4}
      >
        <Paper
          elevation={3}
          sx={{
            p: 6,
            width: '100%',
            borderRadius: 3,
            textAlign: 'center',
          }}
        >
          <CloudUploadIcon
            sx={{
              fontSize: 80,
              color: colorPalette.primary.brightGreen,
              mb: 2,
            }}
          />

          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            fontWeight={700}
            color={colorPalette.primary.darkGreen}
          >
            Upload Your Base Resume
          </Typography>

          <Typography
            variant="body1"
            color="text.secondary"
            mb={4}
            maxWidth="600px"
            mx="auto"
          >
            Upload your resume in DOCX format. We'll extract the content and styling,
            convert it to LaTeX, and you'll be able to tailor it for different job applications.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box mb={4}>
            <input
              accept=".docx"
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
                size="large"
                disabled={uploading}
                sx={{
                  py: 2,
                  px: 4,
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
                Select .DOCX File
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

          {uploading && (
            <Box mb={3}>
              <LinearProgress
                sx={{
                  bgcolor: colorPalette.secondary.lightGreen,
                  '& .MuiLinearProgress-bar': {
                    bgcolor: colorPalette.primary.brightGreen,
                  },
                }}
              />
              <Typography variant="body2" color="text.secondary" mt={1}>
                Uplaoding your resume...
              </Typography>
            </Box>
          )}

          <Button
            variant="contained"
            size="large"
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            startIcon={uploading && <CircularProgress size={20} />}
            sx={{
              py: 1.5,
              px: 4,
              bgcolor: colorPalette.primary.brightGreen,
              '&:hover': {
                bgcolor: colorPalette.secondary.mediumGreen,
              },
            }}
          >
            {uploading ? 'Uploading...' : 'Upload & Convert'}
          </Button>

          <Box mt={4}>
            <Typography variant="caption" color="text.secondary">
              Supported format: .docx only • Max file size: 10MB
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default UploadResume;
