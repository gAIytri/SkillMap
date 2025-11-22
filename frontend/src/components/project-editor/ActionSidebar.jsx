import { Box, Button, Typography, IconButton, Drawer, CircularProgress } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DescriptionIcon from '@mui/icons-material/Description';
import EmailIcon from '@mui/icons-material/Email';
import SendIcon from '@mui/icons-material/Send';
import DownloadIcon from '@mui/icons-material/Download';
import CloseIcon from '@mui/icons-material/Close';
import { colorPalette } from '../../styles/theme';

const ActionSidebar = ({
  isMobile,
  project,
  documentTab,
  onDocumentTabChange,
  uploading,
  downloading,
  tailoring,
  extractedData,
  onReplaceClick,
  onDownloadClick,
  onTailorClick,
  onNavigateToDashboard,
  mobileDrawerOpen,
  onMobileDrawerClose,
}) => {
  // Desktop Sidebar
  if (!isMobile) {
    return (
      <Box
        sx={{
          width: '10%',
          minWidth: '140px',
          maxWidth: '180px',
          bgcolor: '#f8f9fa',
          borderRight: '2px solid #e1e8ed',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          paddingBottom:2,
          px: 1,
          gap: 1,
          overflow: 'auto',
        }}
      >
        {/* Back to Dashboard Button */}
        <Button
          onClick={onNavigateToDashboard}
          size="small"
          startIcon={<ArrowBackIcon />}
          sx={{
            color: colorPalette.primary.darkGreen,
            textTransform: 'none',
            fontFamily: 'Poppins, sans-serif',
            fontSize: '0.75rem',
            justifyContent: 'flex-start',
            px: 1,
            '&:hover': {
              bgcolor: 'rgba(76, 175, 80, 0.1)',
            },
          }}
        >
          Dashboard
        </Button>

        {/* Project Name */}
        <Typography
          variant="caption"
          sx={{
            px: 1,
            py: 1,
            color: '#666',
            fontWeight: 600,
            display: 'block',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={project?.project_name}
        >
          {project?.project_name}
        </Typography>

        {/* Document Tabs - Vertical */}
        <Box sx={{ mt: 2, mb: 2 }}>
          <Typography
            variant="caption"
            sx={{
              px: 1,
              pb: 1,
              color: '#666',
              fontWeight: 600,
              display: 'block',
            }}
          >
            DOCUMENTS
          </Typography>
          <Button
            fullWidth
            onClick={() => onDocumentTabChange(0)}
            startIcon={<DescriptionIcon />}
            sx={{
              justifyContent: 'flex-start',
              color: documentTab === 0 ? '#fff' : colorPalette.primary.darkGreen,
              bgcolor: documentTab === 0 ? colorPalette.primary.darkGreen : 'transparent',
              textTransform: 'none',
              fontFamily: 'Poppins, sans-serif',
              fontSize: '0.7rem',
              px: 1.5,
              py: 1,
              mb: 0.5,
              '&:hover': {
                bgcolor: documentTab === 0 ? colorPalette.primary.darkGreen : 'rgba(76, 175, 80, 0.1)',
              },
            }}
          >
            Resume
          </Button>
          <Button
            fullWidth
            onClick={() => onDocumentTabChange(1)}
            startIcon={<EmailIcon />}
            sx={{
              justifyContent: 'flex-start',
              color: documentTab === 1 ? '#fff' : colorPalette.primary.darkGreen,
              bgcolor: documentTab === 1 ? colorPalette.primary.darkGreen : 'transparent',
              textTransform: 'none',
              fontFamily: 'Poppins, sans-serif',
              fontSize: '0.7rem',
              px: 1.5,
              py: 1,
              mb: 0.5,
              '&:hover': {
                bgcolor: documentTab === 1 ? colorPalette.primary.darkGreen : 'rgba(76, 175, 80, 0.1)',
              },
            }}
          >
            Cover Letter
          </Button>
          <Button
            fullWidth
            onClick={() => onDocumentTabChange(2)}
            startIcon={<SendIcon />}
            sx={{
              justifyContent: 'flex-start',
              color: documentTab === 2 ? '#fff' : colorPalette.primary.darkGreen,
              bgcolor: documentTab === 2 ? colorPalette.primary.darkGreen : 'transparent',
              textTransform: 'none',
              fontFamily: 'Poppins, sans-serif',
              fontSize: '0.7rem',
              px: 1.5,
              py: 1,
              '&:hover': {
                bgcolor: documentTab === 2 ? colorPalette.primary.darkGreen : 'rgba(76, 175, 80, 0.1)',
              },
            }}
          >
            Email
          </Button>
        </Box>

        {/* Action Buttons */}
        <Box sx={{ mt: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography
            variant="caption"
            sx={{
              px: 1,
              pb: 1,
              color: '#666',
              fontWeight: 600,
              display: 'block',
            }}
          >
            ACTIONS
          </Typography>

          {/* Replace Resume Button */}
          <Button
            onClick={onReplaceClick}
            disabled={uploading}
            fullWidth
            size="small"
            variant="outlined"
            startIcon={uploading ? <CircularProgress size={14} /> : <DescriptionIcon />}
            sx={{
              color: colorPalette.primary.darkGreen,
              borderColor: colorPalette.primary.darkGreen,
              textTransform: 'none',
              fontFamily: 'Poppins, sans-serif',
              fontSize: '0.7rem',
              py: 1,
              '&:hover': {
                bgcolor: 'rgba(76, 175, 80, 0.1)',
                borderColor: colorPalette.primary.darkGreen,
              },
              '&:disabled': {
                borderColor: '#cccccc',
                color: '#666666',
              },
            }}
          >
            {uploading ? 'Replacing...' : 'Replace'}
          </Button>

          {/* Download Button */}
          <Button
            onClick={onDownloadClick}
            disabled={downloading}
            fullWidth
            size="small"
            variant="outlined"
            startIcon={<DownloadIcon />}
            sx={{
              color: colorPalette.primary.darkGreen,
              borderColor: colorPalette.primary.darkGreen,
              textTransform: 'none',
              fontFamily: 'Poppins, sans-serif',
              fontSize: '0.7rem',
              py: 1,
              '&:hover': {
                bgcolor: 'rgba(76, 175, 80, 0.1)',
                borderColor: colorPalette.primary.darkGreen,
              },
              '&:disabled': {
                borderColor: '#cccccc',
                color: '#666666',
              },
            }}
          >
            {downloading ? 'Downloading...' : 'Download'}
          </Button>

          {/* Tailor Resume Button */}
          <Button
            onClick={onTailorClick}
            disabled={tailoring || !extractedData}
            fullWidth
            size="small"
            variant="contained"
            sx={{
              bgcolor: colorPalette.primary.darkGreen,
              color: '#ffffff',
              textTransform: 'none',
              fontFamily: 'Poppins, sans-serif',
              fontSize: '0.7rem',
              py: 1,
              '&:hover': {
                bgcolor: '#1a8050',
              },
              '&:disabled': {
                bgcolor: '#cccccc',
                color: '#666666',
              },
            }}
          >
            Tailor
          </Button>
        </Box>
      </Box>
    );
  }

  // Mobile Drawer
  return (
    <Drawer
      anchor="left"
      open={mobileDrawerOpen}
      onClose={onMobileDrawerClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: '280px',
          boxSizing: 'border-box',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          bgcolor: '#ffffff',
          p: 2,
        }}
      >
        {/* Drawer Header */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
            pb: 2,
            borderBottom: '2px solid #e1e8ed',
          }}
        >
          <Typography variant="h6" fontWeight={700} color={colorPalette.primary.darkGreen}>
            Actions
          </Typography>
          <IconButton
            size="small"
            onClick={onMobileDrawerClose}
            sx={{ color: colorPalette.primary.darkGreen }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Action Buttons */}
        <Box display="flex" flexDirection="column" gap={2}>
          {/* Replace Resume Button */}
          <Button
            onClick={() => {
              onReplaceClick();
              onMobileDrawerClose();
            }}
            disabled={uploading}
            variant="outlined"
            fullWidth
            startIcon={uploading ? <CircularProgress size={18} sx={{ color: colorPalette.primary.darkGreen }} /> : null}
            sx={{
              borderColor: colorPalette.primary.darkGreen,
              color: colorPalette.primary.darkGreen,
              textTransform: 'none',
              fontFamily: 'Poppins, sans-serif',
              py: 1.5,
              '&:hover': {
                bgcolor: 'rgba(76, 175, 80, 0.1)',
                borderColor: colorPalette.primary.darkGreen,
              },
            }}
          >
            {uploading ? 'Replacing Resume...' : 'Replace Resume'}
          </Button>

          {/* Download Button */}
          <Button
            onClick={onDownloadClick}
            disabled={downloading}
            variant="contained"
            fullWidth
            startIcon={<DownloadIcon />}
            sx={{
              bgcolor: colorPalette.primary.darkGreen,
              color: '#ffffff',
              textTransform: 'none',
              fontFamily: 'Poppins, sans-serif',
              py: 1.5,
              '&:hover': {
                bgcolor: '#1a8050',
              },
            }}
          >
            Download
          </Button>

          {/* Tailor Resume Button */}
          <Button
            onClick={() => {
              onTailorClick();
              onMobileDrawerClose();
            }}
            disabled={tailoring || !extractedData}
            variant="contained"
            fullWidth
            sx={{
              bgcolor: colorPalette.primary.darkGreen,
              color: '#ffffff',
              textTransform: 'none',
              fontFamily: 'Poppins, sans-serif',
              py: 1.5,
              '&:hover': {
                bgcolor: '#1a8050',
              },
              '&:disabled': {
                bgcolor: '#cccccc',
                color: '#666666',
              },
            }}
          >
            Tailor Resume
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
};

export default ActionSidebar;
