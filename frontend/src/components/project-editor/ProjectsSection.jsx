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
  history,
  onViewingPreviousVersion,
  onRestoreVersion
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Version selection: history.length = current version, 0 to history.length-1 = previous versions
  const [selectedVersionIndex, setSelectedVersionIndex] = useState(history?.length || 0);

  if (!data || data.length === 0) return null;

  const hasHistory = history && history.length > 0;
  const isViewingCurrent = selectedVersionIndex === history?.length;

  // Update selected version when history changes (e.g., after tailoring)
  useEffect(() => {
    if (history && history.length > 0) {
      // If currently viewing current version, update to new current version index
      if (isViewingCurrent) {
        setSelectedVersionIndex(history.length);
      }
    }
  }, [history?.length]);

  // Notify parent when viewing state changes
  useEffect(() => {
    if (onViewingPreviousVersion) {
      onViewingPreviousVersion(!isViewingCurrent);
    }
  }, [isViewingCurrent, onViewingPreviousVersion]);

  // Get content based on selected version
  const getDisplayContent = () => {
    if (isViewingCurrent) {
      return data;
    } else {
      return history[selectedVersionIndex]?.resume_json?.projects || [];
    }
  };

  const handleRestoreVersion = () => {
    if (!isViewingCurrent && onRestoreVersion) {
      const versionData = history[selectedVersionIndex]?.resume_json?.projects;
      if (versionData) {
        onRestoreVersion('projects', versionData);
        // Switch back to current version view
        setSelectedVersionIndex(history.length);
        if (onViewingPreviousVersion) onViewingPreviousVersion(false);
      }
    }
  };

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
                  {(proj.bullets || proj.description ? (
                    proj.bullets || proj.description.split(/[.\n]/).filter(b => b.trim())
                  ) : ['']).map((bullet, bulletIdx) => (
                    <Box key={bulletIdx} sx={{ display: 'flex', gap: 0.5, mb: 1.5, alignItems: 'center' }}>
                      <TextField
                        value={bullet}
                        onChange={(e) => {
                          const newBullets = [...(proj.bullets || proj.description.split(/[.\n]/).filter(b => b.trim()) || [''])];
                          newBullets[bulletIdx] = e.target.value;
                          const updatedData = [...tempData];
                          updatedData[idx] = { ...proj, bullets: newBullets };
                          updateTempField(null, null, updatedData);
                        }}
                        multiline
                        rows={3}
                        placeholder={`Bullet point ${bulletIdx + 1}`}
                        variant="standard"
                        InputProps={{ style: { color: '#fff', fontSize: isMobile ? '14px' : '13px', width: '100%' } }}
                        sx={{
                          flex: 1,
                          minWidth: 0,
                          '& .MuiInput-underline:before': { borderBottomColor: colorPalette.secondary.mediumGreen },
                          '& .MuiInput-underline:after': { borderBottomColor: '#fff' }
                        }}
                      />
                      <IconButton
                        size="small"
                        onClick={() => {
                          const newBullets = [...(proj.bullets || proj.description.split(/[.\n]/).filter(b => b.trim()) || [''])];
                          newBullets.splice(bulletIdx, 1);
                          const updatedData = [...tempData];
                          updatedData[idx] = { ...proj, bullets: newBullets.length > 0 ? newBullets : [''] };
                          updateTempField(null, null, updatedData);
                        }}
                        sx={{ color: '#e74c3c', mt: 0.5, flexShrink: 0 }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                  <Button
                    startIcon={<AddIcon />}
                    onClick={() => {
                      const newBullets = [...(proj.bullets || proj.description.split(/[.\n]/).filter(b => b.trim()) || ['']), ''];
                      const updatedData = [...tempData];
                      updatedData[idx] = { ...proj, bullets: newBullets };
                      updateTempField(null, null, updatedData);
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
              const newData = [...tempData, { name: '', description: '', technologies: [], start_date: '', end_date: '' }];
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
          {projectsData.map((proj, idx) => (
            <Box key={idx} sx={{ mb: 2.5, fontSize: isMobile ? '14px' : '13px' }}>
              <Typography variant="body2" fontWeight={600} sx={{ fontSize: isMobile ? '15px' : '14px', color: '#fff' }}>{proj.name}</Typography>
              {(proj.start_date || proj.end_date) && (
                <Typography variant="caption" sx={{ fontSize: isMobile ? '13px' : '12px', color: colorPalette.secondary.mediumGreen, display: 'block' }}>
                  {proj.start_date} {proj.start_date && proj.end_date && '-'} {proj.end_date}
                </Typography>
              )}
              {/* Display bullet points */}
              {proj.description && (
                <Box component="ul" sx={{ pl: 1.5, pr: 0, mt: 0.5, mb: 0, ml: 0, mr: 0, width: '100%', boxSizing: 'border-box' }}>
                  {proj.description.split('\n').filter(b => b.trim()).map((bullet, bIdx) => (
                    <Typography
                      key={bIdx}
                      component="li"
                      variant="caption"
                      sx={{
                        fontSize: isMobile ? '13px' : '12px',
                        color: '#fff',
                        mb: 0.3,
                        lineHeight: 1.5,
                        pr: 0,
                        width: '100%',
                        wordWrap: 'break-word',
                        textAlign:'justify'
                      }}
                    >
                      {bullet.trim()}
                    </Typography>
                  ))}
                </Box>
              )}
              {proj.technologies && proj.technologies.length > 0 && (
                <Typography variant="caption" display="block" sx={{ fontStyle: 'italic', mt: 0.5, fontSize: isMobile ? '13px' : '12px', color: colorPalette.secondary.mediumGreen }}>
                  Tech: {proj.technologies.join(', ')}
                </Typography>
              )}
            </Box>
          ))}
        </>
      );
    }
  };

  // If no history, show simple view
  if (!hasHistory) {
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
        {/* Previous versions (oldest to newest) */}
        {history.map((_, idx) => (
          <Chip
            key={idx}
            label={idx}
            onClick={() => {
              setSelectedVersionIndex(idx);
              if (onViewingPreviousVersion) onViewingPreviousVersion(true);
            }}
            sx={{
              bgcolor: selectedVersionIndex === idx ? colorPalette.primary.darkGreen : colorPalette.primary.black,
              color: '#fff',
              fontWeight: selectedVersionIndex === idx ? 700 : 500,
              fontSize: '0.75rem',
              height: '28px',
              minWidth: '32px',
              cursor: 'pointer',
              '&:hover': {
                bgcolor: selectedVersionIndex === idx ? colorPalette.primary.darkGreen : colorPalette.secondary.mediumGreen,
              },
            }}
          />
        ))}

        {/* Current version */}
        <Chip
          label={history.length}
          onClick={() => {
            setSelectedVersionIndex(history.length);
            if (onViewingPreviousVersion) onViewingPreviousVersion(false);
          }}
          sx={{
            bgcolor: isViewingCurrent ? colorPalette.primary.brightGreen : colorPalette.primary.black,
            color: '#fff',
            fontWeight: isViewingCurrent ? 700 : 500,
            fontSize: '0.75rem',
            height: '28px',
            minWidth: '32px',
            cursor: 'pointer',
            border: isViewingCurrent ? '2px solid ' + colorPalette.primary.darkGreen : 'none',
            '&:hover': {
              bgcolor: isViewingCurrent ? colorPalette.primary.brightGreen : colorPalette.secondary.mediumGreen,
            },
          }}
        />
      </Box>

      {/* Content Area - Full Width */}
      <Paper elevation={0} sx={{ p: isMobile ? 2 : 3, bgcolor: colorPalette.primary.darkGreen, color: '#fff', position: 'relative' }}>
        {renderProjectContent(displayData, isViewingCurrent)}
        {/* Restore Version Button */}
        {!isEditing && !isViewingCurrent && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button
              variant="contained"
              size="small"
              onClick={handleRestoreVersion}
              sx={{
                bgcolor: colorPalette.primary.brightGreen,
                textTransform: 'none',
                '&:hover': { bgcolor: colorPalette.primary.darkGreen }
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
