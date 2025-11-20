import { Box, Typography, IconButton, Tabs, Tab, Drawer } from '@mui/material';
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

const ExtractedDataPanel = ({
  isMobile,
  isTablet,
  activeTab,
  onTabChange,
  extractedData,
  sectionOrder,
  sensors,
  onDragEnd,
  renderSection,
  mobileDrawerOpen,
  onMobileDrawerClose,
}) => {
  // Common tab content
  const renderTabContent = () => (
    <Box
      sx={{
        flex: 1,
        overflow: 'auto',
        bgcolor: '#fafbfc',
        p: isMobile ? 2 : 0,
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
        /* Formatted View with Drag-and-Drop Reordering */
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={sectionOrder}
            strategy={verticalListSortingStrategy}
          >
            <Box sx={{ pl: 1 }}>
              {sectionOrder.map((sectionKey) => renderSection(sectionKey))}
            </Box>
          </SortableContext>
        </DndContext>
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

  // Desktop/Tablet: Fixed Sidebar
  if (!isMobile) {
    return (
      <Box
        sx={{
          width: isTablet ? '45%' : '40%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          bgcolor: '#ffffff',
        }}
      >
        {/* Tabs for Formatted / Raw JSON */}
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => onTabChange(newValue)}
          sx={{
            borderBottom: '1px solid #e0e0e0',
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
          <Typography variant="subtitle2" fontWeight={700} color="#2c3e50">
            Extracted Data (LLM)
          </Typography>
          <IconButton
            size="small"
            onClick={onMobileDrawerClose}
            sx={{ color: '#2c3e50' }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Tabs for Formatted / Raw JSON */}
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => onTabChange(newValue)}
          sx={{
            borderBottom: '1px solid #e0e0e0',
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
