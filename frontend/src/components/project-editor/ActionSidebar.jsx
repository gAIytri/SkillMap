import { Box, Button, Typography, IconButton, Drawer, CircularProgress } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DescriptionIcon from '@mui/icons-material/Description';
import EmailIcon from '@mui/icons-material/Email';
import SendIcon from '@mui/icons-material/Send';
import DownloadIcon from '@mui/icons-material/Download';
import CloseIcon from '@mui/icons-material/Close';
import { colorPalette } from '../../styles/theme';
import {
  DndContext,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable Section Button Component
const SortableSectionButton = ({ id, label, isActive, onClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{ position: 'relative' }}
    >
      <Button
        fullWidth
        onClick={onClick}
        {...attributes}
        {...listeners}
        sx={{
          justifyContent: 'flex-start',
          color: isActive ? '#fff' : colorPalette.primary.darkGreen,
          bgcolor: isActive ? colorPalette.primary.darkGreen : 'transparent',
          textTransform: 'none',
          fontFamily: 'Poppins, sans-serif',
          fontSize: '0.65rem',
          px: 1,
          py: 0.75,
          mb: 0.5,
          border: '1px solid',
          borderColor: isActive ? colorPalette.primary.darkGreen : '#e1e8ed',
          cursor: isDragging ? 'grabbing' : 'grab',
          '&:hover': {
            bgcolor: isActive ? colorPalette.primary.darkGreen : 'rgba(76, 175, 80, 0.1)',
          },
        }}
      >
        <Typography
          sx={{
            fontSize: '0.65rem',
            fontWeight: isActive ? 600 : 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color:isActive?"white":'black'
          }}
        >
          {label}
        </Typography>
      </Button>
    </Box>
  );
};

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
  // Section navigation props
  sectionOrder,
  sectionNames,
  selectedSection,
  onSelectedSectionChange,
  sensors,
  onDragEnd,
}) => {
  // Desktop Sidebar
  if (!isMobile) {
    return (
      <Box
        sx={{
          width: '15%',
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
          {project?.project_name}
        </Button>

    
         

        {/* Document Tabs - Vertical */}
        <Box sx={{   borderBottom: '2px solid #e1e8ed' }}>
          <Typography
            variant="caption"
            sx={{
              px: 1,
              pb: 0.5,
              color: '#666',
              fontWeight: 600,
              display: 'block',
              fontSize: '0.85rem',
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

        {/* Section Navigation - Vertical & Draggable */}
        {extractedData && sectionOrder && sectionOrder.length > 0 && (
          <Box sx={{  pb: 1, flex: 1, overflow: 'auto', borderBottom: '2px solid #e1e8ed' }}>
            <Typography
              variant="caption"
              sx={{
                px: 1,
                pb:0.5,
                color: '#666',
                fontWeight: 600,
                display: 'block',
                fontSize: '0.85rem',
              }}
            >
              SECTIONS
            </Typography>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={sectionOrder}
                strategy={verticalListSortingStrategy}
              >
                {sectionOrder
                  .filter((sectionKey) => {
                    // Only show sections that have data
                    const data = extractedData[sectionKey];

                    // For personal_info (object), check if it exists and has name
                    if (sectionKey === 'personal_info') {
                      return data && data.name;
                    }

                    // For professional_summary (string), check if not empty
                    if (sectionKey === 'professional_summary') {
                      return data && data.trim().length > 0;
                    }

                    // For arrays (experience, projects, education, skills, certifications)
                    // Check if array exists and has at least one item
                    return Array.isArray(data) && data.length > 0;
                  })
                  .map((sectionKey) => (
                    <SortableSectionButton
                      key={sectionKey}
                      id={sectionKey}
                      label={sectionNames[sectionKey]}
                      isActive={selectedSection === sectionKey}
                      onClick={() => onSelectedSectionChange(sectionKey)}
                    />
                  ))}
              </SortableContext>
            </DndContext>
          </Box>
        )}

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1,  }}>
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
              fontSize: '0.9rem',
              py: 3,
              '&:hover': {
                bgcolor: '#1a8050',
              },
              '&:disabled': {
                bgcolor: '#cccccc',
                color: '#666666',
              },
            }}
          >
            Tailor or Edit
          </Button>

          {/* Replace Resume Button */}
          <Button
            onClick={onReplaceClick}
            disabled={uploading}
            fullWidth
            size="small"
            variant="outlined"
            startIcon={uploading ? <CircularProgress size={14} /> : <></>}
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
            mb: 2,
            pb: 2,
            borderBottom: '2px solid #e1e8ed',
          }}
        >
          <Typography variant="h6" fontWeight={700} color={colorPalette.primary.darkGreen}>
            Menu
          </Typography>
          <IconButton
            size="small"
            onClick={onMobileDrawerClose}
            sx={{ color: colorPalette.primary.darkGreen }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Section Navigation - Mobile */}
        {extractedData && sectionOrder && sectionOrder.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="caption"
              sx={{
                mb: 1,
                color: '#666',
                fontWeight: 600,
                display: 'block',
                fontSize: '0.75rem',
              }}
            >
              SECTIONS
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {sectionOrder
                .filter((sectionKey) => {
                  const data = extractedData[sectionKey];
                  if (sectionKey === 'personal_info') return data && data.name;
                  if (sectionKey === 'professional_summary') return data && data.trim().length > 0;
                  return Array.isArray(data) && data.length > 0;
                })
                .map((sectionKey) => (
                  <Button
                    key={sectionKey}
                    fullWidth
                    onClick={() => {
                      onSelectedSectionChange(sectionKey);
                      onMobileDrawerClose();
                    }}
                    sx={{
                      justifyContent: 'flex-start',
                      color: selectedSection === sectionKey ? '#fff' : colorPalette.primary.darkGreen,
                      bgcolor: selectedSection === sectionKey ? colorPalette.primary.darkGreen : 'transparent',
                      textTransform: 'none',
                      fontSize: '0.8rem',
                      py: 1,
                      border: '1px solid #e1e8ed',
                      '&:hover': {
                        bgcolor: selectedSection === sectionKey ? colorPalette.primary.darkGreen : 'rgba(76, 175, 80, 0.1)',
                      },
                    }}
                  >
                    {sectionNames[sectionKey]}
                  </Button>
                ))}
            </Box>
          </Box>
        )}

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
