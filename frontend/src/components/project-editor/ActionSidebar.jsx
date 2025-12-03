import { Box, Button, Typography, IconButton, Drawer, CircularProgress } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DescriptionIcon from '@mui/icons-material/Description';
import EmailIcon from '@mui/icons-material/Email';
import SendIcon from '@mui/icons-material/Send';
import DownloadIcon from '@mui/icons-material/Download';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
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
const SortableSectionButton = ({ id, label, isActive, onClick, onDelete, isCustom }) => {
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
            color:isActive?"white":'black',
            pr: isCustom ? 2.5 : 0  // Add padding when delete icon is present
          }}
        >
          {label}
        </Typography>
        {/* Delete icon for custom sections */}
        {isCustom && (
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(id);
            }}
            sx={{
              position: 'absolute',
              right: 2,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 16,
              height: 16,
              padding: 0,
              color: isActive ? '#fff' : '#e74c3c',
              opacity: 0.7,
              '&:hover': {
                opacity: 1,
                bgcolor: 'rgba(231, 76, 60, 0.2)'
              }
            }}
          >
            <CloseIcon sx={{ fontSize: 12 }} />
          </IconButton>
        )}
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
  onAddCustomSection,
  onDeleteSection,
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
          px: 2,
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
            height: '80px',
            justifyContent: 'flex-start',
            px: 1,
            '&:hover': {
              bgcolor: 'rgba(76, 175, 80, 0.1)',
            },
            // Text overflow handling
            overflow: 'hidden',
            '& .MuiButton-startIcon': {
              flexShrink: 0, // Prevent icon from shrinking
            },
            // Style the text content
            display: 'flex',
            alignItems: 'center',
            whiteSpace: 'normal', // Allow wrapping
            wordBreak: 'break-word',
            lineHeight: 1.2,
            textAlign: 'left',
          }}
        >
          <Box
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 3, // Show max 3 lines before truncating
              WebkitBoxOrient: 'vertical',
              lineHeight: 1.3,
            }}
          >
            {project?.project_name}
          </Box>
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
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1, pb: 0.5 }}>
              <Typography
                variant="caption"
                sx={{
                  color: '#666',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                }}
              >
                SECTIONS
              </Typography>
              <IconButton
                size="small"
                onClick={onAddCustomSection}
                sx={{
                  color: colorPalette.primary.darkGreen,
                  bgcolor: 'rgba(76, 175, 80, 0.1)',
                  width: 24,
                  height: 24,
                  '&:hover': {
                    bgcolor: colorPalette.primary.brightGreen,
                    color: 'white',
                  }
                }}
              >
                <AddIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>

            {/* Personal Info - Fixed at top, non-draggable */}
            {extractedData.personal_info && extractedData.personal_info.name && (
              <Button
                fullWidth
                onClick={() => onSelectedSectionChange('personal_info')}
                sx={{
                  justifyContent: 'flex-start',
                  color: selectedSection === 'personal_info' ? '#fff' : colorPalette.primary.darkGreen,
                  bgcolor: selectedSection === 'personal_info' ? colorPalette.primary.darkGreen : 'transparent',
                  textTransform: 'none',
                  fontFamily: 'Poppins, sans-serif',
                  fontSize: '0.65rem',
                  px: 1,
                  py: 0.75,
                  mb: 0.5,
                  border: '1px solid',
                  borderColor: selectedSection === 'personal_info' ? colorPalette.primary.darkGreen : '#e1e8ed',
                  cursor: 'pointer',
                  opacity: 0.8, // Slightly dimmed to show it's fixed
                  '&:hover': {
                    bgcolor: selectedSection === 'personal_info' ? colorPalette.primary.darkGreen : 'rgba(76, 175, 80, 0.1)',
                    opacity: 1,
                  },
                }}
              >
                <Typography
                  sx={{
                    fontSize: '0.65rem',
                    fontWeight: selectedSection === 'personal_info' ? 600 : 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: selectedSection === 'personal_info' ? 'white' : 'black',
                  }}
                >
                  {sectionNames['personal_info']}
                </Typography>
              </Button>
            )}

            {/* Other sections - Draggable */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={sectionOrder.filter(key => key !== 'personal_info')}
                strategy={verticalListSortingStrategy}
              >
                {sectionOrder
                  .filter((sectionKey) => {
                    // Exclude personal_info - it's rendered separately above
                    if (sectionKey === 'personal_info') {
                      return false;
                    }

                    // Check if this is a custom section
                    if (sectionKey.startsWith('custom_')) {
                      const customSections = extractedData.custom_sections || [];
                      return customSections.some(section => section.id === sectionKey);
                    }

                    // Only show sections that have data
                    const data = extractedData[sectionKey];

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
                      onDelete={onDeleteSection}
                      isCustom={sectionKey.startsWith('custom_')}
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

          {/* Download Button - Hide on Email tab */}
          {documentTab !== 2 && (
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
          )}
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
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography
                variant="caption"
                sx={{
                  color: '#666',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                }}
              >
                SECTIONS
              </Typography>
              <IconButton
                size="small"
                onClick={() => {
                  onAddCustomSection();
                  onMobileDrawerClose();
                }}
                sx={{
                  color: colorPalette.primary.darkGreen,
                  bgcolor: 'rgba(76, 175, 80, 0.1)',
                  width: 24,
                  height: 24,
                  '&:hover': {
                    bgcolor: colorPalette.primary.brightGreen,
                    color: 'white',
                  }
                }}
              >
                <AddIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {/* Personal Info - Fixed at top (mobile) */}
              {extractedData.personal_info && extractedData.personal_info.name && (
                <Box sx={{ position: 'relative' }}>
                  <Button
                    fullWidth
                    onClick={() => {
                      onSelectedSectionChange('personal_info');
                      onMobileDrawerClose();
                    }}
                    sx={{
                      justifyContent: 'flex-start',
                      color: selectedSection === 'personal_info' ? '#fff' : colorPalette.primary.darkGreen,
                      bgcolor: selectedSection === 'personal_info' ? colorPalette.primary.darkGreen : 'transparent',
                      textTransform: 'none',
                      fontSize: '0.8rem',
                      py: 1,
                      border: '1px solid #e1e8ed',
                      opacity: 0.8, // Slightly dimmed to show it's fixed
                      '&:hover': {
                        bgcolor: selectedSection === 'personal_info' ? colorPalette.primary.darkGreen : 'rgba(76, 175, 80, 0.1)',
                        opacity: 1,
                      },
                    }}
                  >
                    {sectionNames['personal_info']}
                  </Button>
                </Box>
              )}

              {/* Other sections */}
              {sectionOrder
                .filter((sectionKey) => {
                  // Exclude personal_info - rendered separately above
                  if (sectionKey === 'personal_info') {
                    return false;
                  }

                  // Check if this is a custom section
                  if (sectionKey.startsWith('custom_')) {
                    const customSections = extractedData.custom_sections || [];
                    return customSections.some(section => section.id === sectionKey);
                  }

                  const data = extractedData[sectionKey];
                  if (sectionKey === 'professional_summary') return data && data.trim().length > 0;
                  return Array.isArray(data) && data.length > 0;
                })
                .map((sectionKey) => (
                  <Box key={sectionKey} sx={{ position: 'relative' }}>
                    <Button
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
                    {/* Delete icon for custom sections */}
                    {sectionKey.startsWith('custom_') && (
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSection(sectionKey);
                        }}
                        sx={{
                          position: 'absolute',
                          right: 8,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: 20,
                          height: 20,
                          padding: 0,
                          color: selectedSection === sectionKey ? '#fff' : '#e74c3c',
                          opacity: 0.7,
                          '&:hover': {
                            opacity: 1,
                            bgcolor: 'rgba(231, 76, 60, 0.2)'
                          }
                        }}
                      >
                        <CloseIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    )}
                  </Box>
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

          {/* Download Button - Hide on Email tab */}
          {documentTab !== 2 && (
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
          )}

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
