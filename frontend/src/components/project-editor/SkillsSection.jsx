import { useState } from 'react';
import { Box, Typography, Paper, TextField, useTheme, useMediaQuery, IconButton, Button, Chip } from '@mui/material';
import { colorPalette } from '../../styles/theme';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

const SkillsSection = ({
  sectionKey,
  data,
  isEditing,
  tempData,
  updateTempField,
  versionHistory,      // NEW: { "0": data, "1": data, ... }
  currentVersion,      // NEW: version number (e.g., 0, 1, 2)
  onRestoreVersion,    // NEW: (versionNumber) => void
  onViewingVersionChange  // NEW: callback to notify parent of version change
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Track which version is being viewed (always a number)
  const [viewingVersion, setViewingVersion] = useState(currentVersion);

  if (!data || data.length === 0) return null;

  // Check if we have version history
  const hasHistory = versionHistory && Object.keys(versionHistory).length > 0;

  // Get all version numbers sorted (0, 1, 2, ...)
  const versionNumbers = hasHistory
    ? Object.keys(versionHistory).map(Number).sort((a, b) => a - b)
    : [];

  // Get content based on selected version
  const getDisplayContent = () => {
    if (viewingVersion === currentVersion) {
      // Viewing the current version - show data from resume_json
      return data;
    }
    // Viewing an older version - show from version_history
    return versionHistory[viewingVersion] || [];
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
      // Stay on the same tab after restoration
    }
  };

  // Show version tabs if we have multiple versions
  const showVersionTabs = currentVersion > 0 || (hasHistory && versionNumbers.length > 0);

  const displayData = getDisplayContent();

  // If no version tabs needed, show simple view
  if (!showVersionTabs) {
    return (
      <Box>
          <Paper elevation={0} sx={{ p: isMobile ? 2 : 3, mb: 2, bgcolor: colorPalette.primary.darkGreen, color: '#fff' }}>
            {isEditing ? (
              // EDITING MODE
              <>
                {tempData.map((skillCat, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      mb: 3,
                      p: 2.5,
                      borderRadius: '8px',
                      bgcolor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      position: 'relative'
                    }}
                  >
                    {/* Delete button - positioned at top right */}
                    <IconButton
                      size="small"
                      onClick={() => {
                        const newData = [...tempData];
                        newData.splice(idx, 1);
                        updateTempField(null, null, newData);
                      }}
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        color: '#e74c3c',
                        bgcolor: 'rgba(0, 0, 0, 0.2)',
                        '&:hover': {
                          bgcolor: 'rgba(231, 76, 60, 0.2)'
                        }
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pr: 5 }}>
                      <TextField
                        label="Category"
                        value={skillCat.category || ''}
                        onChange={(e) => updateTempField(idx, 'category', e.target.value)}
                        fullWidth
                        variant="standard"
                        InputLabelProps={{ style: { color: colorPalette.secondary.mediumGreen } }}
                        InputProps={{ style: { color: '#fff', fontSize: isMobile ? '15px' : '14px' } }}
                        sx={{ '& .MuiInput-underline:before': { borderBottomColor: colorPalette.secondary.mediumGreen }, '& .MuiInput-underline:after': { borderBottomColor: '#fff' } }}
                      />
                      <TextField
                        label="Skills (comma-separated)"
                        value={skillCat.skills ? skillCat.skills.join(', ') : ''}
                        onChange={(e) => updateTempField(idx, 'skills', e.target.value.split(',').map(s => s.trim()))}
                        fullWidth
                        variant="standard"
                        InputLabelProps={{ style: { color: colorPalette.secondary.mediumGreen } }}
                        InputProps={{ style: { color: '#fff', fontSize: isMobile ? '14px' : '13px' } }}
                        sx={{ '& .MuiInput-underline:before': { borderBottomColor: colorPalette.secondary.mediumGreen }, '& .MuiInput-underline:after': { borderBottomColor: '#fff' } }}
                      />
                    </Box>
                  </Box>
                ))}
                <Button
                  startIcon={<AddIcon />}
                  onClick={() => {
                    const newData = [...tempData, { category: '', skills: [] }];
                    updateTempField(null, null, newData);
                  }}
                  sx={{ color: '#fff', textTransform: 'none', mt: 2 }}
                >
                  Add Skill Category
                </Button>
              </>
            ) : (
              // VIEW MODE
              data.map((skillCat, idx) => (
                <Box key={idx} sx={{ mb: 1.5, fontSize: isMobile ? '14px' : '13px' }}>
                  <Typography variant="caption" fontWeight={600} sx={{ fontSize: isMobile ? '14px' : '13px', color: '#fff' }}>{skillCat.category}:</Typography>
                  <Typography variant="caption" sx={{ ml: 1, fontSize: isMobile ? '13px' : '12px', color: '#fff'  }}>{skillCat.skills.join(', ')}</Typography>
                </Box>
              ))
            )}
      </Paper>
    </Box>
  );
  }

  // With version history - show version tabs
  return (
    <Box>
      {/* Info Label */}
      <Box>
        <Typography variant="caption" sx={{ fontSize: '10px', color: '#111111', fontStyle: 'italic' }}>
          Click version number to view. Green border = current active version. Use "Make This Current" to restore.
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
        {/* All version chips */}
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

      {/* Content Area */}
      <Paper elevation={0} sx={{ p: isMobile ? 2 : 3, bgcolor: colorPalette.primary.darkGreen, color: '#fff', position: 'relative' }}>
        {isEditing && viewingVersion === currentVersion ? (
          // EDITING MODE (only on current version)
          <>
            {tempData.map((skillCat, idx) => (
              <Box
                key={idx}
                sx={{
                  mb: 3,
                  p: 2.5,
                  borderRadius: '8px',
                  bgcolor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  position: 'relative'
                }}
              >
                {/* Delete button - positioned at top right */}
                <IconButton
                  size="small"
                  onClick={() => {
                    const newData = [...tempData];
                    newData.splice(idx, 1);
                    updateTempField(null, null, newData);
                  }}
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    color: '#e74c3c',
                    bgcolor: 'rgba(0, 0, 0, 0.2)',
                    '&:hover': {
                      bgcolor: 'rgba(231, 76, 60, 0.2)'
                    }
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pr: 5 }}>
                  <TextField
                    label="Category"
                    value={skillCat.category || ''}
                    onChange={(e) => updateTempField(idx, 'category', e.target.value)}
                    fullWidth
                    variant="standard"
                    InputLabelProps={{ style: { color: colorPalette.secondary.mediumGreen } }}
                    InputProps={{ style: { color: '#fff', fontSize: isMobile ? '15px' : '14px' } }}
                    sx={{ '& .MuiInput-underline:before': { borderBottomColor: colorPalette.secondary.mediumGreen }, '& .MuiInput-underline:after': { borderBottomColor: '#fff' } }}
                  />
                  <TextField
                    label="Skills (comma-separated)"
                    value={skillCat.skills ? skillCat.skills.join(', ') : ''}
                    onChange={(e) => updateTempField(idx, 'skills', e.target.value.split(',').map(s => s.trim()))}
                    fullWidth
                    variant="standard"
                    InputLabelProps={{ style: { color: colorPalette.secondary.mediumGreen } }}
                    InputProps={{ style: { color: '#fff', fontSize: isMobile ? '14px' : '13px' } }}
                    sx={{ '& .MuiInput-underline:before': { borderBottomColor: colorPalette.secondary.mediumGreen }, '& .MuiInput-underline:after': { borderBottomColor: '#fff' } }}
                  />
                </Box>
              </Box>
            ))}
            <Button
              startIcon={<AddIcon />}
              onClick={() => {
                const newData = [...tempData, { category: '', skills: [] }];
                updateTempField(null, null, newData);
              }}
              sx={{ color: '#fff', textTransform: 'none', mt: 2 }}
            >
              Add Skill Category
            </Button>
          </>
        ) : (
          // VIEW MODE
          <>
            {displayData.map((skillCat, idx) => (
              <Box key={idx} sx={{ mb: 1.5, fontSize: isMobile ? '14px' : '13px' }}>
                <Typography variant="caption" fontWeight={600} sx={{ fontSize: isMobile ? '14px' : '13px', color: '#fff' }}>{skillCat.category}:</Typography>
                <Typography variant="caption" sx={{ ml: 1, fontSize: isMobile ? '13px' : '12px', color: '#fff' }}>{skillCat.skills.join(', ')}</Typography>
              </Box>
            ))}

            {/* Restore Version Button - Show ONLY when viewing a version that is NOT current */}
            {viewingVersion !== currentVersion && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleRestoreVersion}
                  sx={{
                    bgcolor: colorPalette.primary.brightGreen,
                    color: '#000',
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': { bgcolor: colorPalette.secondary.mediumGreen }
                  }}
                >
                  Make This Current
                </Button>
              </Box>
            )}
          </>
        )}
      </Paper>
    </Box>
  );
};

export default SkillsSection;
