import { Box, Typography, IconButton, Tabs, Tab, Drawer, Chip, TextField, Button } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import { colorPalette } from '../../styles/theme';
import {
  DndContext,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable Tab Component
const SortableTab = ({ id, label, isActive, onClick }) => {
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
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  // Handle click separately to ensure it fires
  const handleClick = (e) => {
    if (!isDragging && onClick) {
      onClick(e);
    }
  };

  return (
    <Chip
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      label={label}
      onClick={handleClick}
      sx={{
        bgcolor: isActive ? colorPalette.primary.darkGreen : colorPalette.secondary.lightGreen,
        color: isActive ? '#fff' : '#333',
        fontWeight: isActive ? 700 : 500,
        fontSize: '0.875rem',
        height: '32px',
        px: 1.5,
        cursor: isDragging ? 'grabbing' : 'pointer',
        transition: 'all 0.2s',
        '&:hover': {
          bgcolor: isActive ? colorPalette.primary.darkGreen : colorPalette.secondary.lightGreen,
        },
      }}
    />
  );
};

const ExtractedDataPanel = ({
  isMobile,
  isTablet,
  activeTab,
  onTabChange,
  extractedData,
  sectionOrder,
  sectionNames,
  onSectionNameChange,
  selectedSection,
  onSelectedSectionChange,
  viewingPreviousVersion,
  sensors,
  onDragEnd,
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
  renderSectionTitle,
}) => {
  // Common tab content
  const renderTabContent = () => (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        bgcolor: colorPalette.secondary.gray,
      }}
    >
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
      ) : activeTab === 0 ? (
        /* Formatted View with Section Tabs */
        <>
          {/* Section Tabs - Draggable */}
          <Box
            sx={{
              bgcolor: '#ffffff',
              borderBottom: `1px solid #111111`,
              p: 2,
              pb: 1,
            }}
          >
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={sectionOrder}
                strategy={horizontalListSortingStrategy}
              >
                <Box
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 1,
                  }}
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
                      <SortableTab
                        key={sectionKey}
                        id={sectionKey}
                        label={sectionNames[sectionKey]}
                        isActive={selectedSection === sectionKey}
                        onClick={() => onSelectedSectionChange(sectionKey)}
                      />
                    ))}
                </Box>
              </SortableContext>
            </DndContext>
          </Box>

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
                    <EditIcon sx={{ fontSize: 18, color: colorPalette.primary.brightGreen }} />
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
              p: isMobile ? 1.5 : 2,
              paddingTop:2,
              bgcolor: colorPalette.secondary.gray
            }}
          >
            {renderSection(selectedSection)}
          </Box>
        </>
      ) : (
        /* Raw JSON View */
        <Box
          sx={{
            height: '100%',
            bgcolor: '#1e1e1e',
            color: '#d4d4d4',
            p: 2,
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '11px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            overflow: 'auto',
          }}
        >
          {JSON.stringify(extractedData, null, 2)}
        </Box>
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
        {/* Tabs for Formatted / Raw JSON */}
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => onTabChange(newValue)}
          sx={{
            borderBottom: `1px solid ${colorPalette.secondary.mediumGreen}`,
            minHeight: '40px',
            '& .MuiTab-root': {
              minHeight: '40px',
              textTransform: 'none',
              fontSize: '0.875rem',
              fontWeight: 600,
            },
          }}
        >
          <Tab label="Formatted View" />
          <Tab label="Raw JSON" />
        </Tabs>

        {/* Tab Content */}
        {renderTabContent()}
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
            Extracted Data (LLM)
          </Typography>
          <IconButton
            size="small"
            onClick={onMobileDrawerClose}
            sx={{ color: colorPalette.primary.darkGreen }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Tabs for Formatted / Raw JSON */}
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => onTabChange(newValue)}
          sx={{
            borderBottom: `1px solid ${colorPalette.secondary.mediumGreen}`,
            minHeight: '40px',
            '& .MuiTab-root': {
              minHeight: '40px',
              textTransform: 'none',
              fontSize: '0.875rem',
              fontWeight: 600,
            },
          }}
        >
          <Tab label="Formatted" />
          <Tab label="JSON" />
        </Tabs>

        {/* Tab Content */}
        {renderTabContent()}
      </Box>
    </Drawer>
  );
};

export default ExtractedDataPanel;
