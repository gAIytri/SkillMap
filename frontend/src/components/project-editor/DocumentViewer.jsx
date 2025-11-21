import { Box, Button, Typography, Paper, IconButton, Tabs, Tab, CircularProgress } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DescriptionIcon from '@mui/icons-material/Description';
import EmailIcon from '@mui/icons-material/Email';
import SendIcon from '@mui/icons-material/Send';
import DownloadIcon from '@mui/icons-material/Download';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import toast from 'react-hot-toast';
import { colorPalette } from '../../styles/theme';

const DocumentViewer = ({
  isMobile,
  documentTab,
  onDocumentTabChange,
  onLeftMenuClick,
  onRightMenuClick,
  pdfZoom,
  onZoomIn,
  onZoomOut,
  pendingChanges,
  compiling,
  onCompile,
  pdfLoading,
  reorderingPdf,
  pdfUrl,
  onLoadPdfPreview,
  iframeRef,
  coverLetter,
  email,
  project,
}) => {
  return (
    <Box
      sx={{
        flex: 1,
        borderRight: isMobile ? 'none' : '2px solid #e1e8ed',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        bgcolor: '#ffffff',
      }}
    >
      {/* Document Tabs: Mobile Only (Desktop uses sidebar) */}
      {isMobile && (
        <Box
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Left: Menu icon for actions drawer */}
          <IconButton
            onClick={onLeftMenuClick}
            sx={{
              ml: 1,
              color: colorPalette.primary.darkGreen,
              '&:hover': {
                bgcolor: 'rgba(76, 175, 80, 0.1)',
              },
            }}
          >
            <MenuIcon />
          </IconButton>

          {/* Center: Document tabs */}
          <Tabs
            value={documentTab}
            onChange={(_e, newValue) => onDocumentTabChange(newValue)}
            sx={{
              minHeight: '40px',
              flex: 1,
              '& .MuiTab-root': {
                minHeight: '40px',
                minWidth: 'auto',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.7rem',
                px: 0.5,
                py: 0.5,
              },
              '& .MuiTab-iconWrapper': {
                fontSize: '16px',
                marginRight: '4px',
              },
            }}
          >
            <Tab icon={<DescriptionIcon fontSize="small" />} iconPosition="start" label="Resume" />
            <Tab icon={<EmailIcon fontSize="small" />} iconPosition="start" label="Cover Letter" />
            <Tab icon={<SendIcon fontSize="small" />} iconPosition="start" label="Email" />
          </Tabs>

          {/* Right: Menu icon for extracted data drawer */}
          <IconButton
            onClick={onRightMenuClick}
            sx={{
              mr: 1,
              color: colorPalette.primary.darkGreen,
              '&:hover': {
                bgcolor: 'rgba(76, 175, 80, 0.1)',
              },
            }}
          >
            <MenuIcon />
          </IconButton>
        </Box>
      )}

      {/* Zoom Controls (only for Resume tab) */}
      {documentTab === 0 && (
        <Box
          sx={{
            px: isMobile ? 1 : 2,
            py: isMobile ? 0.3 : 0.5,
            bgcolor: 'rgba(76, 175, 80, 0.04)',
            display: 'flex',
            justifyContent: isMobile ? 'center' : 'space-between',
            alignItems: 'center',
          }}
        >
          {/* Hide "PDF Preview" text on mobile to save space */}
          {!isMobile && (
            <Typography variant="subtitle2" fontWeight={700} color="#2c3e50">
              PDF Preview
            </Typography>
          )}
          <Box display="flex" alignItems="center">
            <Button
              variant="outlined"
              size="small"
              onClick={onZoomOut}
              disabled={pdfZoom <= 60}
              sx={{
                color: '#2c3e50',
                borderColor: 'transparent',
                textTransform: 'none',
                fontSize: isMobile ? '0.75rem' : '0.85rem',
                fontWeight: 'bold',
                minWidth: isMobile ? '24px' : '30px',
                px: 0,
                py: 0,
                '&:hover': {
                  bgcolor: 'rgba(76, 175, 80, 0.1)',
                  borderColor: colorPalette.primary.darkGreen,
                },
              }}
            >
              -
            </Button>
            <Typography variant="caption" sx={{ minWidth: isMobile ? '40px' : '50px', textAlign: 'center', color: '#2c3e50', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 600 }}>
              {pdfZoom}%
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={onZoomIn}
              disabled={pdfZoom >= 200}
              sx={{
                color: '#2c3e50',
                borderColor: 'transparent',
                textTransform: 'none',
                fontSize: isMobile ? '0.75rem' : '0.85rem',
                fontWeight: 'bold',
                minWidth: isMobile ? '24px' : '30px',
                px: 0,
                py: 0,
                '&:hover': {
                  bgcolor: 'rgba(76, 175, 80, 0.1)',
                  borderColor: colorPalette.primary.darkGreen,
                },
              }}
            >
              +
            </Button>

            {/* Compile Button */}
            <Button
              variant="contained"
              size="small"
              onClick={onCompile}
              disabled={!pendingChanges || compiling}
              startIcon={compiling ? <CircularProgress size={14} sx={{ color: '#ffffff' }} /> : null}
              sx={{
                ml: isMobile ? 1 : 2,
                bgcolor: pendingChanges ? colorPalette.primary.brightGreen : '#cccccc',
                color: '#ffffff',
                textTransform: 'none',
                fontSize: isMobile ? '0.65rem' : '0.75rem',
                fontWeight: 600,
                px: isMobile ? 1.5 : 2,
                py: isMobile ? 0.4 : 0.5,
                '&:hover': {
                  bgcolor: pendingChanges ? '#1a8050' : '#cccccc',
                },
                '&:disabled': {
                  bgcolor: '#cccccc',
                  color: '#999999',
                },
              }}
            >
              {compiling ? 'Compiling...' : pendingChanges ? 'Compile' : 'Compiled'}
            </Button>
          </Box>
        </Box>
      )}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          bgcolor: '#f5f7fa',
          overflow: 'auto',
          p: 0.5,
        }}
      >
        {/* Resume Tab */}
        {documentTab === 0 && (
          <>
            {pdfLoading || reorderingPdf ? (
              <Box textAlign="center" sx={{ alignSelf: 'center' }}>
                <CircularProgress sx={{ color: colorPalette.primary.darkGreen }} />
                <Typography variant="body2" color="text.secondary" mt={2}>
                  {reorderingPdf ? 'Reordering sections...' : 'Generating PDF preview...'}
                </Typography>
              </Box>
            ) : pdfUrl ? (
              <Box
                sx={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'flex-start',
                  overflow: 'auto',
                  bgcolor: '#e0e0e0',
                }}
              >
                <iframe
                  ref={iframeRef}
                  key={`pdf-${pdfZoom}`}
                  src={`${pdfUrl}#zoom=${pdfZoom}&toolbar=0&navpanes=0`}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    backgroundColor: '#FFF',
                  }}
                  title="Resume PDF Preview"
                />
              </Box>
            ) : (
              <Paper elevation={3} sx={{ p: 4, maxWidth: '400px', textAlign: 'center' }}>
                <Typography variant="body2" color="error">
                  Failed to load PDF preview
                </Typography>
                <Button variant="outlined" onClick={onLoadPdfPreview} sx={{ mt: 2 }}>
                  Retry
                </Button>
              </Paper>
            )}
          </>
        )}

        {/* Cover Letter Tab */}
        {documentTab === 1 && (
          <Box sx={{ width: '100%', height: '100%', p: 1, overflow: 'auto' }}>
            {coverLetter ? (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6" fontWeight={600} color="#2c3e50">
                    Cover Letter
                  </Typography>
                  <Button
                    startIcon={<DownloadIcon />}
                    size="small"
                    onClick={() => {
                      // Download as .txt file
                      const blob = new Blob([coverLetter], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${project?.project_name || 'cover-letter'}_cover_letter.txt`;
                      a.click();
                      URL.revokeObjectURL(url);
                      toast.success('Cover letter downloaded!');
                    }}
                    sx={{ textTransform: 'none' }}
                  >
                    Download
                  </Button>
                </Box>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    bgcolor: '#fff',
                    border: '1px solid #e0e0e0',
                    whiteSpace: 'pre-wrap',
                    fontFamily: '"Times New Roman", serif',
                    fontSize: '14px',
                    lineHeight: 1.6,
                  }}
                >
                  {coverLetter}
                </Paper>
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: '#666',
                }}
              >
                <EmailIcon sx={{ fontSize: 48, color: '#bbb', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" textAlign="center">
                  Click "Tailor Resume" to generate cover letter
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center" mt={1}>
                  A professional cover letter will be created alongside your tailored resume
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Email Tab */}
        {documentTab === 2 && (
          <Box sx={{ width: '100%', height: '100%', p: 1, overflow: 'auto' }}>
            {email ? (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6" fontWeight={600} color="#2c3e50">
                    Recruiter Email
                  </Typography>
                  <Button
                    startIcon={<ContentCopyIcon />}
                    size="small"
                    onClick={() => {
                      const emailText = `Subject: ${email.subject}\n\n${email.body}`;
                      navigator.clipboard.writeText(emailText);
                      toast.success('Email copied to clipboard!');
                    }}
                    sx={{ textTransform: 'none' }}
                  >
                    Copy Email
                  </Button>
                </Box>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    bgcolor: '#fff',
                    border: '1px solid #e0e0e0',
                  }}
                >
                  <Typography variant="subtitle2" color="text.secondary" mb={1}>
                    Subject:
                  </Typography>
                  <Typography variant="body1" fontWeight={600} mb={3} sx={{ color: '#2c3e50' }}>
                    {email.subject}
                  </Typography>
                  <Box
                    sx={{
                      borderTop: '1px solid #e0e0e0',
                      pt: 3,
                    }}
                  >
                    <Typography variant="subtitle2" color="text.secondary" mb={1}>
                      Body:
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{
                        whiteSpace: 'pre-wrap',
                        fontFamily: '"Arial", sans-serif',
                        fontSize: '14px',
                        lineHeight: 1.6,
                        color: '#333',
                      }}
                    >
                      {email.body}
                    </Typography>
                  </Box>
                </Paper>
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: '#666',
                }}
              >
                <SendIcon sx={{ fontSize: 48, color: '#bbb', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" textAlign="center">
                  Click "Tailor Resume" to generate email
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center" mt={1}>
                  A professional recruiter email will be created alongside your tailored resume
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default DocumentViewer;
