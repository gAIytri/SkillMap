import React from 'react';
import { Box, Container, Paper, Typography, Button } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import { colorPalette } from '../../styles/theme';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details for debugging
    console.error('Error Boundary caught an error:', error, errorInfo);

    // Store error details in state
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });

    // You can also log the error to an error reporting service here
    // Example: logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    // Clear error state and attempt to recover
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    // Optionally reload the page for a clean state
    window.location.href = '/';
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Render fallback UI
      return (
        <Container maxWidth="md" sx={{ mt: 8 }}>
          <Paper
            sx={{
              p: 6,
              textAlign: 'center',
              borderRadius: 2,
              border: `2px solid ${colorPalette.error}`,
            }}
          >
            <ErrorOutlineIcon
              sx={{
                fontSize: 80,
                color: colorPalette.error,
                mb: 3,
              }}
            />

            <Typography variant="h4" fontWeight={700} gutterBottom>
              Oops! Something went wrong
            </Typography>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
              We encountered an unexpected error. This has been logged and we'll look into it.
              Please try refreshing the page or going back to the home page.
            </Typography>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <Box
                sx={{
                  mt: 3,
                  mb: 3,
                  p: 2,
                  bgcolor: '#f5f5f5',
                  borderRadius: 1,
                  textAlign: 'left',
                  maxHeight: 300,
                  overflow: 'auto',
                }}
              >
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  Error Details (Development Mode):
                </Typography>
                <Typography
                  variant="body2"
                  component="pre"
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {this.state.error.toString()}
                  {'\n\n'}
                  {this.state.errorInfo?.componentStack}
                </Typography>
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={this.handleReload}
                sx={{
                  borderColor: colorPalette.primary,
                  color: colorPalette.primary,
                  '&:hover': {
                    borderColor: colorPalette.primaryDark,
                    bgcolor: 'rgba(99, 102, 241, 0.04)',
                  },
                }}
              >
                Refresh Page
              </Button>

              <Button
                variant="contained"
                onClick={this.handleReset}
                sx={{
                  bgcolor: colorPalette.primary,
                  '&:hover': {
                    bgcolor: colorPalette.primaryDark,
                  },
                }}
              >
                Go to Home
              </Button>
            </Box>
          </Paper>
        </Container>
      );
    }

    // No error, render children normally
    return this.props.children;
  }
}

export default ErrorBoundary;
