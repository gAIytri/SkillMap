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

  // If no history, show simple view
  if (!hasHistory) {
    return (
      <Box>
          <Paper elevation={0} sx={{ p: isMobile ? 2 : 3, mb: 2, bgcolor: colorPalette.primary.darkGreen, color: '#fff' }}>
            {isEditing ? (
              // EDITING MODE - All projects editable
              <>
                {tempData.map((proj, idx) => (
                  <Box key={idx} sx={{ mb: 4, display: 'flex', gap: 2 }}>
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                      <TextField
                        label="Project Name"
                        value={proj.name || ''}
                        onChange={(e) => updateTempField(idx, 'name', e.target.value)}
                        fullWidth
                        variant="standard"
                        InputLabelProps={{ style: { color: 'colorPalette.secondary.mediumGreen' } }}
                        InputProps={{ style: { color: '#fff', fontSize: isMobile ? '15px' : '14px' } }}
                        sx={{ '& .MuiInput-underline:before': { borderBottomColor: 'colorPalette.secondary.mediumGreen' }, '& .MuiInput-underline:after': { borderBottomColor: '#fff' } }}
                      />
                      <Box sx={{ display: 'flex', gap: 2, flexDirection: isMobile ? 'column' : 'row' }}>
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
                      <TextField
                        label="Description"
                        value={proj.description || ''}
                        onChange={(e) => updateTempField(idx, 'description', e.target.value)}
                        fullWidth
                        multiline
                        rows={6}
                        variant="standard"
                        InputLabelProps={{ style: { color: colorPalette.secondary.mediumGreen } }}
                        InputProps={{ style: { color: '#fff', fontSize: isMobile ? '14px' : '13px', lineHeight: 1.6 } }}
                        sx={{ '& .MuiInput-underline:before': { borderBottomColor: colorPalette.secondary.mediumGreen }, '& .MuiInput-underline:after': { borderBottomColor: '#fff' } }}
                      />
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
                    <IconButton
                      size="small"
                      onClick={() => {
                        const newData = [...tempData];
                        newData.splice(idx, 1);
                        updateTempField(null, null, newData);
                      }}
                      sx={{ color: '#e74c3c', alignSelf: 'flex-start' }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
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
            ) : (
              // VIEW MODE - Display only
              data.map((proj, idx) => (
                <Box key={idx} sx={{ mb: 2.5, fontSize: isMobile ? '14px' : '13px' }}>
                  <Typography variant="body2" fontWeight={600} sx={{ fontSize: isMobile ? '15px' : '14px', color: '#fff' }}>{proj.name}</Typography>
                  {(proj.start_date || proj.end_date) && (
                    <Typography variant="caption" sx={{ fontSize: isMobile ? '13px' : '12px', color: colorPalette.secondary.mediumGreen, display: 'block' }}>
                      {proj.start_date} {proj.start_date && proj.end_date && '-'} {proj.end_date}
                    </Typography>
                  )}
                  <Typography variant="caption" sx={{ fontSize: isMobile ? '13px' : '12px', color: '#fff' }}>{proj.description}</Typography>
                  {proj.technologies && proj.technologies.length > 0 && (
                    <Typography variant="caption" display="block" sx={{ fontStyle: 'italic', mt: 0.5, fontSize: isMobile ? '13px' : '12px', color: colorPalette.secondary.mediumGreen }}>
                      Tech: {proj.technologies.join(', ')}
                    </Typography>
                  )}
                </Box>
              ))
            )}
      </Paper>
      </Box>
    );
  }

  // With history - show vertical tabs + content
  const displayData = getDisplayContent();

  return (
    <Box>
      {/* Info Labels */}
      <Box sx={{ display: 'flex', gap: 1, mb: 0.5 }}>
        <Box sx={{ minWidth: '40px', maxWidth: '40px', textAlign: 'center' }}>
          <Typography variant="caption" sx={{ fontSize: '10px', color: '#111111', fontStyle: 'italic' }}>
            V*
          </Typography>
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" sx={{ fontSize: '10px', color: '#111111', fontStyle: 'italic' }}>
            Click version number to view. Use "Make This Current" to restore.
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
        {/* Vertical Version Tabs - Very Thin */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5,
            minWidth: '40px',
            maxWidth: '40px',
            bgcolor: colorPalette.primary.darkGreen,
            p: 0.5,
            borderRadius: '4px',
          }}
        >
          {/* Previous versions (oldest to newest) */}
          {history.map((version, idx) => (
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
                height: '32px',
                minWidth: '32px',
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: selectedVersionIndex === idx ? colorPalette.primary.darkGreen : 'colorPalette.secondary.mediumGreen',
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
              height: '32px',
              minWidth: '32px',
              cursor: 'pointer',
              border: isViewingCurrent ? '2px solid ' + colorPalette.primary.darkGreen : 'none',
              '&:hover': {
                bgcolor: isViewingCurrent ? colorPalette.primary.brightGreen : 'colorPalette.secondary.mediumGreen',
              },
            }}
          />
        </Box>

        {/* Content Area */}
        <Box sx={{ flex: 1 }}>
          <Paper elevation={0} sx={{ p: isMobile ? 2 : 3, bgcolor: colorPalette.primary.darkGreen, color: '#fff', position: 'relative' }}>
            {isEditing && isViewingCurrent ? (
              // EDITING MODE
              <>
                {tempData.map((proj, idx) => (
                  <Box key={idx} sx={{ mb: 4, display: 'flex', gap: 2 }}>
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                      <TextField
                        label="Project Name"
                        value={proj.name || ''}
                        onChange={(e) => updateTempField(idx, 'name', e.target.value)}
                        fullWidth
                        variant="standard"
                        InputLabelProps={{ style: { color: 'colorPalette.secondary.mediumGreen' } }}
                        InputProps={{ style: { color: '#fff', fontSize: isMobile ? '15px' : '14px' } }}
                        sx={{ '& .MuiInput-underline:before': { borderBottomColor: 'colorPalette.secondary.mediumGreen' }, '& .MuiInput-underline:after': { borderBottomColor: '#fff' } }}
                      />
                      <Box sx={{ display: 'flex', gap: 2, flexDirection: isMobile ? 'column' : 'row' }}>
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
                      <TextField
                        label="Description"
                        value={proj.description || ''}
                        onChange={(e) => updateTempField(idx, 'description', e.target.value)}
                        fullWidth
                        multiline
                        rows={6}
                        variant="standard"
                        InputLabelProps={{ style: { color: colorPalette.secondary.mediumGreen } }}
                        InputProps={{ style: { color: '#fff', fontSize: isMobile ? '14px' : '13px', lineHeight: 1.6 } }}
                        sx={{ '& .MuiInput-underline:before': { borderBottomColor: colorPalette.secondary.mediumGreen }, '& .MuiInput-underline:after': { borderBottomColor: '#fff' } }}
                      />
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
                    <IconButton
                      size="small"
                      onClick={() => {
                        const newData = [...tempData];
                        newData.splice(idx, 1);
                        updateTempField(null, null, newData);
                      }}
                      sx={{ color: '#e74c3c', alignSelf: 'flex-start' }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
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
            ) : (
              // VIEW MODE
              <>
                {displayData.map((proj, idx) => (
                  <Box key={idx} sx={{ mb: 2.5, fontSize: isMobile ? '14px' : '13px' }}>
                    <Typography variant="body2" fontWeight={600} sx={{ fontSize: isMobile ? '15px' : '14px', color: '#fff' }}>{proj.name}</Typography>
                    {(proj.start_date || proj.end_date) && (
                      <Typography variant="caption" sx={{ fontSize: isMobile ? '13px' : '12px', color: colorPalette.secondary.mediumGreen, display: 'block' }}>
                        {proj.start_date} {proj.start_date && proj.end_date && '-'} {proj.end_date}
                      </Typography>
                    )}
                    <Typography variant="caption" sx={{ fontSize: isMobile ? '13px' : '12px', color: '#fff' }}>{proj.description}</Typography>
                    {proj.technologies && proj.technologies.length > 0 && (
                      <Typography variant="caption" display="block" sx={{ fontStyle: 'italic', mt: 0.5, fontSize: isMobile ? '13px' : '12px', color: colorPalette.secondary.mediumGreen }}>
                        Tech: {proj.technologies.join(', ')}
                      </Typography>
                    )}
                  </Box>
                ))}

                {/* Restore Version Button - Inside the content box */}
                {!isViewingCurrent && (
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
              </>
            )}
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};

export default ProjectsSection;
