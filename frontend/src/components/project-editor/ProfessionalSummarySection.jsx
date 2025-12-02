import { useState, useEffect } from 'react';
import { Box, Typography, Paper, TextField, useTheme, useMediaQuery, Button, Chip, CircularProgress } from '@mui/material';
import { colorPalette } from '../../styles/theme';

const ProfessionalSummarySection = ({
  sectionKey,
  data,
  isEditing,
  tempData,
  onTempDataChange,
  versionHistory,      // NEW: { "0": content, "1": content, ... }
  currentVersion,      // NEW: version number (e.g., 0, 1, 2)
  onRestoreVersion,    // NEW: (versionNumber) => void
  onViewingVersionChange,  // NEW: callback to notify parent of version change
  restoringVersion = false  // NEW: loading state for version restoration
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Track which version is being viewed (now it's always a number, not 'current')
  const [viewingVersion, setViewingVersion] = useState(currentVersion);

  // Auto-switch to latest version when currentVersion updates (after tailoring)
  useEffect(() => {
    setViewingVersion(currentVersion);
    if (onViewingVersionChange) {
      onViewingVersionChange(currentVersion);
    }
  }, [currentVersion]); // FIXED: Removed onViewingVersionChange from deps to prevent infinite loop

  // Listen for external version changes (e.g., when switching to edit mode)
  useEffect(() => {
    // This effect runs when isEditing becomes true
    if (isEditing && viewingVersion !== currentVersion) {
      setViewingVersion(currentVersion);
      if (onViewingVersionChange) {
        onViewingVersionChange(currentVersion);
      }
    }
  }, [isEditing]); // Switch to current version when entering edit mode

  if (!data) return null;

  // Check if we have version history
  const hasHistory = versionHistory && Object.keys(versionHistory).length > 0;

  // Get all version numbers sorted (0, 1, 2, ...)
  const versionNumbers = hasHistory
    ? Object.keys(versionHistory).map(Number).sort((a, b) => a - b)
    : [];

  // Get content for display based on selected version
  const getDisplayContent = () => {
    if (viewingVersion === currentVersion) {
      // Viewing the current version - show data from resume_json
      return data;
    }
    // Viewing an older version - show from version_history
    return versionHistory[viewingVersion] || 'No content available';
  };

  const handleVersionClick = (versionNum) => {
    setViewingVersion(versionNum);
    if (onViewingVersionChange) {
      onViewingVersionChange(versionNum);
    }
  };

  const handleRestoreVersion = () => {
    if (viewingVersion !== currentVersion && onRestoreVersion) {
      onRestoreVersion(viewingVersion);
      // After restoration, the viewingVersion is now the current one
      // No need to change viewingVersion - it stays on the same tab
    }
  };

  // Show version tabs only if we have multiple versions (more than just V0)
  const showVersionTabs = hasHistory && versionNumbers.length > 1;

  // If no version tabs needed, show simple view
  if (!showVersionTabs) {
    return (
      <Box>
        <Paper elevation={0} sx={{ p: isMobile ? 2 : 3, mb: 2, bgcolor: colorPalette.primary.darkGreen, color: '#fff' }}>
          {isEditing ? (
            <TextField
              value={tempData}
              onChange={(e) => onTempDataChange(e.target.value)}
              multiline
              rows={8}
              fullWidth
              variant="standard"
              autoFocus
              placeholder="Enter professional summary..."
              slotProps={{
                input: {
                  style: { color: '#fff', fontSize: isMobile ? '15px' : '14px', lineHeight: 1.6 }
                }
              }}
              sx={{
                '& .MuiInput-underline:before': { borderBottomColor: colorPalette.secondary.mediumGreen },
                '& .MuiInput-underline:after': { borderBottomColor: '#fff' }
              }}
            />
          ) : (
            <Typography variant="body2" sx={{ fontSize: isMobile ? '14px' : '13px', lineHeight: 1.7, color: '#fff', textAlign: 'justify' }}>
              {data}
            </Typography>
          )}
        </Paper>
      </Box>
    );
  }

  // With history - show horizontal tabs at top + content below
  return (
    <Box>
      {/* Info Label */}
      <Box>
       <Typography variant="caption" sx={{ fontSize: '10px', color: '#111111', fontWeight:'bold'}}>
          Click version number to view. Use " Make This Current " to restore.
        </Typography>
      </Box>

      {/* Horizontal Version Tabs */}
      <Box
        sx={{
          display: 'flex',
          gap: 0.5,
          mb: 1,
          p: 0.5,
          bgcolor: colorPalette.primary.darkGreen,
          borderRadius: '4px',
          flexWrap: 'wrap',
        }}
      >
        {/* All version chips - only show versions from version_history */}
        {versionNumbers.map((versionNum) => {
          const isSelected = viewingVersion === versionNum;
          const isCurrent = currentVersion === versionNum;

          return (
            <Chip
              key={`v${versionNum}`}
              label={`V${versionNum}`}
              onClick={() => handleVersionClick(versionNum)}
              sx={{
                bgcolor: isSelected ? '#fff' : colorPalette.primary.black,
                color: isSelected ? '#000' : '#fff',
                fontWeight: isSelected ? 700 : 500,
                fontSize: '0.75rem',
                height: '28px',
                minWidth: '40px',
                cursor: 'pointer',
                // Green border if this version is current
                border: isCurrent ? `2px solid ${colorPalette.primary.brightGreen}` : 'none',
                '&:hover': {
                  bgcolor: isSelected ? '#fff' : colorPalette.secondary.mediumGreen,
                  color: isSelected ? '#000' : '#fff',
                },
              }}
            />
          );
        })}
      </Box>

      {/* Content Area - Full Width */}
      <Paper elevation={0} sx={{ p: isMobile ? 2 : 3, bgcolor: colorPalette.primary.darkGreen, color: '#fff', position: 'relative' }}>
        {isEditing && viewingVersion === currentVersion ? (
          <TextField
            value={tempData}
            onChange={(e) => onTempDataChange(e.target.value)}
            multiline
            rows={8}
            fullWidth
            variant="standard"
            autoFocus
            placeholder="Enter professional summary..."
            slotProps={{
              input: {
                style: { color: '#fff', fontSize: isMobile ? '15px' : '14px', lineHeight: 1.6 }
              }
            }}
            sx={{
              '& .MuiInput-underline:before': { borderBottomColor: colorPalette.secondary.mediumGreen },
              '& .MuiInput-underline:after': { borderBottomColor: '#fff' }
            }}
          />
        ) : (
          <>
            <Typography variant="body2" sx={{ fontSize: isMobile ? '14px' : '13px', lineHeight: 1.7, color: '#fff', mb: viewingVersion !== currentVersion ? 3 : 0, textAlign: 'justify' }}>
              {getDisplayContent()}
            </Typography>

            {/* Restore Version Button - Show ONLY when viewing a version that is NOT current */}
            {viewingVersion !== currentVersion && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleRestoreVersion}
                  disabled={restoringVersion}
                  startIcon={restoringVersion ? <CircularProgress size={16} sx={{ color: '#000' }} /> : null}
                  sx={{
                    bgcolor: colorPalette.primary.brightGreen,
                    color: '#000',
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': { bgcolor: colorPalette.secondary.mediumGreen },
                    '&:disabled': { bgcolor: colorPalette.secondary.mediumGreen, color: '#000' }
                  }}
                >
                  {restoringVersion ? 'Restoring...' : 'Make This Current'}
                </Button>
              </Box>
            )}
          </>
        )}
      </Paper>
    </Box>
  );
};

export default ProfessionalSummarySection;
