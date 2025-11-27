import { useState, useEffect } from 'react';
import { Box, Typography, Paper, TextField, useTheme, useMediaQuery, IconButton, Button, Chip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { colorPalette } from '../../styles/theme';

const ProjectsSection = ({
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

  // Auto-switch to latest version when currentVersion updates (after tailoring)
  useEffect(() => {
    setViewingVersion(currentVersion);
    if (onViewingVersionChange) {
      onViewingVersionChange(currentVersion);
    }
  }, [currentVersion, onViewingVersionChange]);

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

  // Render project content (used by both with/without history)
  const renderProjectContent = (projectsData, canEdit) => {
    if (canEdit && isEditing) {
      // EDITING MODE
      return (
        <>
          {tempData.map((proj, idx) => (
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

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pr: 5 }}>
                <TextField
                  label="Project Name"
                  value={proj.name || ''}
                  onChange={(e) => updateTempField(idx, 'name', e.target.value)}
                  fullWidth
                  variant="standard"
                  InputLabelProps={{ style: { color: colorPalette.secondary.mediumGreen } }}
                  InputProps={{ style: { color: '#fff', fontSize: isMobile ? '15px' : '14px' } }}
                  sx={{ '& .MuiInput-underline:before': { borderBottomColor: colorPalette.secondary.mediumGreen }, '& .MuiInput-underline:after': { borderBottomColor: '#fff' } }}
                />
                <Box sx={{ display: 'flex', gap: 1.5, flexDirection: isMobile ? 'column' : 'row' }}>
                  <TextField
                    label="Start Date"
                    value={proj.start_date || ''}
                    onChange={(e) => updateTempField(idx, 'start_date', e.target.value)}
                    fullWidth
                    variant="standard"
                    InputLabelProps={{ style: { color: colorPalette.secondary.mediumGreen } }}
                    InputProps={{ style: { color: '#fff', fontSize: isMobile ? '15px' : '14px' } }}
                    sx={{ '& .MuiInput-underline:before': { borderBottomColor: colorPalette.secondary.mediumGreen }, '& .MuiInput-underline:after': { borderBottomColor: '#fff' } }}
                  />
                  <TextField
                    label="End Date"
                    value={proj.end_date || ''}
                    onChange={(e) => updateTempField(idx, 'end_date', e.target.value)}
                    fullWidth
                    variant="standard"
                    InputLabelProps={{ style: { color: colorPalette.secondary.mediumGreen } }}
                    InputProps={{ style: { color: '#fff', fontSize: isMobile ? '15px' : '14px' } }}
                    sx={{ '& .MuiInput-underline:before': { borderBottomColor: colorPalette.secondary.mediumGreen }, '& .MuiInput-underline:after': { borderBottomColor: '#fff' } }}
                  />
                </Box>
                {/* Description Bullet Points */}
                <Box width={'120%'}>
                  <Typography variant="caption" sx={{ color: colorPalette.secondary.mediumGreen, mb: 1, display: 'block' }}>
                    Description (Bullet Points)
                  </Typography>
                  {(() => {
                    // Handle both bullets array and description string for backward compatibility
                    let bullets;
                    if (proj.bullets && Array.isArray(proj.bullets) && proj.bullets.length > 0) {
                      bullets = proj.bullets;
                    } else if (proj.description && typeof proj.description === 'string') {
                      // If we have description string, split it into bullets
                      bullets = proj.description.split('\n').filter(b => b.trim());
                    } else {
                      bullets = [''];
                    }
                    const bulletsCount = bullets.length;

                    return bullets.map((bullet, bulletIdx) => (
                      <Box key={bulletIdx} sx={{ display: 'flex', gap: 1, mb: 1.5, alignItems: 'flex-start' }}>
                        <TextField
                          value={bullet}
                          onChange={(e) => {
                            const newBullets = [...bullets];
                            newBullets[bulletIdx] = e.target.value;
                            updateTempField(idx, 'bullets', newBullets);
                          }}
                          multiline
                          rows={3}
                          placeholder={`Bullet point ${bulletIdx + 1}`}
                          variant="standard"
                          slotProps={{
                            input: {
                              style: { color: '#fff', fontSize: isMobile ? '14px' : '13px', width: '100%' }
                            }
                          }}
                          sx={{
                            flex: 1,
                            minWidth: 0,
                            maxWidth: 'calc(100% - 48px)',
                            '& .MuiInput-underline:before': { borderBottomColor: colorPalette.secondary.mediumGreen },
                            '& .MuiInput-underline:after': { borderBottomColor: '#fff' }
                          }}
                        />
                        {/* Only show delete button if there's more than one bullet point */}
                        {bulletsCount > 1 && (
                          <IconButton
                            size="small"
                            onClick={() => {
                              const newBullets = [...bullets];
                              newBullets.splice(bulletIdx, 1);
                              updateTempField(idx, 'bullets', newBullets.length > 0 ? newBullets : ['']);
                            }}
                            sx={{ color: '#e74c3c', mt: 0.5, flexShrink: 0, ml: 0 }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                    ));
                  })()}
                  <Button
                    startIcon={<AddIcon />}
                    onClick={() => {
                      // Get current bullets (from either bullets array or description string)
                      let currentBullets;
                      if (proj.bullets && Array.isArray(proj.bullets) && proj.bullets.length > 0) {
                        currentBullets = proj.bullets;
                      } else if (proj.description && typeof proj.description === 'string') {
                        currentBullets = proj.description.split('\n').filter(b => b.trim());
                      } else {
                        currentBullets = [''];
                      }
                      const newBullets = [...currentBullets, ''];
                      updateTempField(idx, 'bullets', newBullets);
                    }}
                    size="small"
                    sx={{ color: colorPalette.secondary.mediumGreen, textTransform: 'none', fontSize: '12px' }}
                  >
                    Add Bullet Point
                  </Button>
                </Box>
                <TextField
                  label="Technologies (comma-separated)"
                  value={proj.technologies ? proj.technologies.join(', ') : ''}
                  onChange={(e) => updateTempField(idx, 'technologies', e.target.value.split(',').map(t => t.trim()))}
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
              const newData = [...tempData, { name: '', bullets: [], technologies: [], start_date: '', end_date: '' }];
              updateTempField(null, null, newData);
            }}
            sx={{ color: '#fff', textTransform: 'none', mt: 2 }}
          >
            Add Project
          </Button>
        </>
      );
    } else {
      // VIEW MODE
      return (
        <>
          {projectsData.map((proj, idx) => {
            // Get bullets from either bullets array or description string
            let displayBullets = [];
            if (proj.bullets && Array.isArray(proj.bullets) && proj.bullets.length > 0) {
              displayBullets = proj.bullets;
            } else if (proj.description && typeof proj.description === 'string') {
              displayBullets = proj.description.split('\n').filter(b => b.trim());
            }

            return (
              <Box key={idx} sx={{ mb: 2.5, fontSize: isMobile ? '14px' : '13px' }}>
                <Typography variant="body2" fontWeight={600} sx={{ fontSize: isMobile ? '15px' : '14px', color: '#fff' }}>{proj.name}</Typography>
                {(proj.start_date || proj.end_date) && (
                  <Typography variant="caption" sx={{ fontSize: isMobile ? '13px' : '12px', color: colorPalette.secondary.mediumGreen, display: 'block' }}>
                    {proj.start_date} {proj.start_date && proj.end_date && '-'} {proj.end_date}
                  </Typography>
                )}
                {/* Display bullet points */}
                {displayBullets.length > 0 && (
                  <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                    {displayBullets.map((bullet, bidx) => (
                      <li key={bidx} style={{ fontSize: isMobile ? '13px' : '12px', color: '#fff', marginBottom: '6px', textAlign: 'justify' }}>{bullet}</li>
                    ))}
                  </ul>
                )}
                {proj.technologies && proj.technologies.length > 0 && (
                  <Typography variant="caption" display="block" sx={{ fontStyle: 'italic', mt: 0.5, fontSize: isMobile ? '13px' : '12px', color: colorPalette.secondary.mediumGreen }}>
                    Tech: {proj.technologies.join(', ')}
                  </Typography>
                )}
              </Box>
            );
          })}
        </>
      );
    }
  };

  // If no version tabs needed, show simple view
  if (!showVersionTabs) {
    return (
      <Box>
          <Paper elevation={0} sx={{ p: isMobile ? 2 : 3, mb: 2, bgcolor: colorPalette.primary.darkGreen, color: '#fff' }}>
            {renderProjectContent(data, true)}
          </Paper>
      </Box>
    );
  }

  // With history - show horizontal tabs at top + content below
  const displayData = getDisplayContent();

  return (
    <Box>
      {/* Info Label */}
      <Box >
        <Typography variant="caption" sx={{ fontSize: '10px', color: '#111111', fontStyle: 'italic' }}>
          Click version number to view. Use "Make This Current" to restore.
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
        {renderProjectContent(displayData, viewingVersion === currentVersion)}
        {/* Restore Version Button - Show ONLY when viewing a version that is NOT current */}
        {!isEditing && viewingVersion !== currentVersion && (
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
      </Paper>
    </Box>
  );
};

export default ProjectsSection;
