import { Box, Typography, IconButton, Drawer, TextField, CircularProgress } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import { colorPalette } from '../../styles/theme';

const ExtractedDataPanel = ({
  isMobile,
  isTablet,
  extractedData,
  sectionNames,
  onSectionNameChange,
  selectedSection,
  viewingPreviousVersion,
  width = 35,
  onResizeStart,
  isResizing = false,
  renderSection,
  mobileDrawerOpen,
  onMobileDrawerClose,
  editingSection,
  onStartEditingSection,
  onSaveSection,
  onCancelEditingSection,
  versionHistoryLoading = false,
}) => {
  // Content - Always show formatted view
  const renderContent = () => (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        bgcolor: colorPalette.secondary.gray,
        position: 'relative', // For loading overlay positioning
      }}
    >
      {/* Loading Overlay - Shows while version history is being fetched */}
      {versionHistoryLoading && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: '#f4f4f4',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            gap: 2,
          }}
        >
          <CircularProgress
            sx={{
              color: colorPalette.primary.brightGreen
            }}
            size={50}
          />
          <Typography
            variant="body2"
            sx={{
              color: 'Black',
              fontWeight: 600
            }}
          >
            Updating Changes...
          </Typography>
        </Box>
      )}

      {!extractedData ? (
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
          <Typography variant="body2" color="text.secondary" textAlign="center">
            No data extracted yet
          </Typography>
          <Typography variant="caption" color="text.secondary" textAlign="center" mt={1}>
            Upload a resume to see extracted JSON data
          </Typography>
        </Box>
      ) : (
        /* Formatted View - Section content only (tabs moved to left sidebar) */
        <>
          {/* Section Header with Edit Controls */}
          <Box
            sx={{
              bgcolor: colorPalette.secondary.gray,
              borderBottom: `1px solid #111111`,
              p: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            {editingSection === selectedSection ? (
              /* Editing Section Name */
              <>
                <TextField
                  value={sectionNames[selectedSection]}
                  onChange={(e) => onSectionNameChange(selectedSection, e.target.value)}
                  variant="standard"
                  size="small"
                  sx={{
                    flex: 1,
                    maxWidth: '300px',
                    '& .MuiInputBase-root': {
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      color: colorPalette.primary.darkGreen,
                    },
                    '& .MuiInput-underline:before': { borderBottomColor: colorPalette.secondary.mediumGreen },
                    '& .MuiInput-underline:after': { borderBottomColor: colorPalette.primary.darkGreen }
                  }}
                />
                <IconButton
                  size="small"
                  onClick={onSaveSection}
                  sx={{ color: colorPalette.primary.brightGreen }}
                >
                  <CheckIcon fontSize="medium" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={onCancelEditingSection}
                  sx={{ color: '#f44336' }}
                >
                  <CloseIcon fontSize="medium" />
                </IconButton>
              </>
            ) : (
              /* Viewing Section Name */
              <>
                <Typography variant="h6" fontWeight={700} sx={{ color: colorPalette.primary.darkGreen, flex: 1 }}>
                  {sectionNames[selectedSection]}
                </Typography>
                {/* Hide edit button when viewing previous version */}
                {!viewingPreviousVersion && (
                  <IconButton
                    size="small"
                    onClick={() => onStartEditingSection(selectedSection)}
                    sx={{
                      opacity: 0.7,
                      '&:hover': { opacity: 1, bgcolor: 'rgba(76, 175, 80, 0.1)' }
                    }}
                  >
                    <EditIcon sx={{ fontSize: 15, color: colorPalette.primary.brightGreen }} />
                  </IconButton>
                )}
              </>
            )}
          </Box>

          {/* Selected Section Content */}
          <Box
            sx={{
              flex: 1,
              overflow: 'auto',
              p: 1,
              paddingTop:1,
              bgcolor: colorPalette.secondary.gray,
              // Hide scrollbar while keeping scroll functionality
              '&::-webkit-scrollbar': {
                display: 'none',
              },
              '-ms-overflow-style': 'none',  // IE and Edge
              'scrollbarWidth': 'none',  // Firefox
            }}
          >
            {renderSection(selectedSection)}
          </Box>
        </>
      )}
    </Box>
  );

  // Desktop/Tablet: Resizable Sidebar
  if (!isMobile) {
    return (
      <Box
        sx={{
          width: `${width}%`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          bgcolor: '#ffffff',
          position: 'relative',
          transition: isResizing ? 'none' : 'width 0.1s ease',
        }}
      >
        {/* Drag Handle */}
        <Box
          onMouseDown={onResizeStart}
          sx={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '6px',
            cursor: 'ew-resize',
            bgcolor: 'transparent',
            zIndex: 10,
            '&:hover': {
              bgcolor: colorPalette.primary.brightGreen,
              opacity: 0.5,
            },
            '&:active': {
              bgcolor: colorPalette.primary.brightGreen,
              opacity: 0.8,
            },
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: '3px',
              height: '40px',
              bgcolor: colorPalette.secondary.mediumGreen,
              borderRadius: '2px',
              opacity: 0.6,
            }}
          />
        </Box>

        {/* Content - No tabs, always formatted view */}
        {renderContent()}
      </Box>
    );
  }

  // Mobile: Drawer
  return (
    <Drawer
      anchor="right"
      open={mobileDrawerOpen}
      onClose={onMobileDrawerClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: '85%',
          maxWidth: '400px',
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
        }}
      >
        {/* Drawer Header */}
        <Box
          sx={{
            px: 2,
            py: 1,
            border: '2px solid',
            borderColor: colorPalette.primary.darkGreen,
            bgcolor: 'rgba(76, 175, 80, 0.04)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography variant="subtitle2" fontWeight={700} color="colorPalette.primary.darkGreen">
            Extracted Data
          </Typography>
          <IconButton
            size="small"
            onClick={onMobileDrawerClose}
            sx={{ color: colorPalette.primary.darkGreen }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Content - No tabs, always formatted view */}
        {renderContent()}
      </Box>
    </Drawer>
  );
};

export default ExtractedDataPanel;
