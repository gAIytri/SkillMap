import { useState, useEffect } from 'react';
import { Box, Typography, Paper, TextField, useTheme, useMediaQuery, IconButton, Button, Chip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { colorPalette } from '../../styles/theme';

const ExperienceSection = ({
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
      return history[selectedVersionIndex]?.resume_json?.experience || [];
    }
  };

  const handleRestoreVersion = () => {
    if (!isViewingCurrent && onRestoreVersion) {
      const versionData = history[selectedVersionIndex]?.resume_json?.experience;
      if (versionData) {
        onRestoreVersion('experience', versionData);
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
              // EDITING MODE
              <>
                {tempData.map((exp, idx) => (
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
                        label="Job Title"
                        value={exp.title || ''}
                        onChange={(e) => updateTempField(idx, 'title', e.target.value)}
                        fullWidth
                        variant="standard"
                        InputLabelProps={{ style: { color: colorPalette.secondary.mediumGreen } }}
                        InputProps={{ style: { color: '#fff', fontSize: isMobile ? '15px' : '14px' } }}
                        sx={{ '& .MuiInput-underline:before': { borderBottomColor: colorPalette.secondary.mediumGreen }, '& .MuiInput-underline:after': { borderBottomColor: '#fff' } }}
                      />
                      <TextField
                        label="Company"
                        value={exp.company || ''}
                        onChange={(e) => updateTempField(idx, 'company', e.target.value)}
                        fullWidth
                        variant="standard"
                        InputLabelProps={{ style: { color: colorPalette.secondary.mediumGreen } }}
                        InputProps={{ style: { color: '#fff', fontSize: isMobile ? '15px' : '14px' } }}
                        sx={{ '& .MuiInput-underline:before': { borderBottomColor: colorPalette.secondary.mediumGreen }, '& .MuiInput-underline:after': { borderBottomColor: '#fff' } }}
                      />
                      <Box sx={{ display: 'flex', gap: 1.5, flexDirection: isMobile ? 'column' : 'row' }}>
                        <TextField
                          label="Start Date"
                          value={exp.start_date || ''}
                          onChange={(e) => updateTempField(idx, 'start_date', e.target.value)}
                          fullWidth
                          variant="standard"
                          InputLabelProps={{ style: { color: colorPalette.secondary.mediumGreen } }}
                          InputProps={{ style: { color: '#fff', fontSize: isMobile ? '15px' : '14px' } }}
                          sx={{ '& .MuiInput-underline:before': { borderBottomColor: colorPalette.secondary.mediumGreen }, '& .MuiInput-underline:after': { borderBottomColor: '#fff' } }}
                        />
                        <TextField
                          label="End Date"
                          value={exp.end_date || ''}
                          onChange={(e) => updateTempField(idx, 'end_date', e.target.value)}
                          fullWidth
                          variant="standard"
                          InputLabelProps={{ style: { color: colorPalette.secondary.mediumGreen } }}
                          InputProps={{ style: { color: '#fff', fontSize: isMobile ? '15px' : '14px' } }}
                          sx={{ '& .MuiInput-underline:before': { borderBottomColor: colorPalette.secondary.mediumGreen }, '& .MuiInput-underline:after': { borderBottomColor: '#fff' } }}
                        />
                      </Box>
                      <TextField
                        label="Location"
                        value={exp.location || ''}
                        onChange={(e) => updateTempField(idx, 'location', e.target.value)}
                        fullWidth
                        variant="standard"
                        InputLabelProps={{ style: { color: colorPalette.secondary.mediumGreen } }}
                        InputProps={{ style: { color: '#fff', fontSize: isMobile ? '15px' : '14px' } }}
                        sx={{ '& .MuiInput-underline:before': { borderBottomColor: colorPalette.secondary.mediumGreen }, '& .MuiInput-underline:after': { borderBottomColor: '#fff' } }}
                      />
                      {/* Bullet Points - Individual Inputs */}
                      <Box width={'120%'}>
                        <Typography variant="caption" sx={{ color: colorPalette.secondary.mediumGreen, mb: 1, display: 'block' }}>
                          Responsibilities / Achievements (Bullet Points)
                        </Typography>
                        {(exp.bullets && exp.bullets.length > 0 ? exp.bullets : ['']).map((bullet, bulletIdx) => (
                          <Box key={bulletIdx} sx={{ display: 'flex', gap: 0.5, mb: 1.5, alignItems: 'flex-start' }}>
                            <TextField
                              value={bullet}
                              onChange={(e) => {
                                const newBullets = [...(exp.bullets || [''])];
                                newBullets[bulletIdx] = e.target.value;
                                updateTempField(idx, 'bullets', newBullets);
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
                                const newBullets = [...(exp.bullets || [''])];
                                newBullets.splice(bulletIdx, 1);
                                updateTempField(idx, 'bullets', newBullets.length > 0 ? newBullets : ['']);
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
                            const newBullets = [...(exp.bullets || ['']), ''];
                            updateTempField(idx, 'bullets', newBullets);
                          }}
                          size="small"
                          sx={{ color: colorPalette.secondary.mediumGreen, textTransform: 'none', fontSize: '12px' }}
                        >
                          Add Bullet Point
                        </Button>
                      </Box>
                    </Box>
                  </Box>
                ))}
                <Button
                  startIcon={<AddIcon />}
                  onClick={() => {
                    const newData = [...tempData, { title: '', company: '', bullets: [], start_date: '', end_date: '', location: '' }];
                    updateTempField(null, null, newData);
                  }}
                  sx={{ color: '#fff', textTransform: 'none', mt: 2 }}
                >
                  Add Experience
                </Button>
              </>
            ) : (
              // VIEW MODE
              data.map((exp, idx) => (
                <Box key={idx} sx={{ mb: 2.5, fontSize: isMobile ? '14px' : '13px' }}>
                  <Typography variant="body2" fontWeight={600} sx={{ fontSize: isMobile ? '15px' : '14px', color: '#fff' }}>
                    {exp.title} at {exp.company}
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: isMobile ? '13px' : '12px', color: colorPalette.secondary.mediumGreen }}>
                    {exp.start_date} - {exp.end_date}
                    {exp.location && ` | ${exp.location}`}
                  </Typography>
                  {exp.bullets && exp.bullets.length > 0 && (
                    <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                      {exp.bullets.map((bullet, bidx) => (
                        <li key={bidx} style={{ fontSize: isMobile ? '13px' : '12px', color: '#fff', marginBottom: '6px' }}>{bullet}</li>
                      ))}
                    </ul>
                  )}
                </Box>
              ))
            )}
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
            {isEditing && isViewingCurrent ? (
              // EDITING MODE
              <>
                {tempData.map((exp, idx) => (
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
                        label="Job Title"
                        value={exp.title || ''}
                        onChange={(e) => updateTempField(idx, 'title', e.target.value)}
                        fullWidth
                        variant="standard"
                        InputLabelProps={{ style: { color: colorPalette.secondary.mediumGreen } }}
                        InputProps={{ style: { color: '#fff', fontSize: isMobile ? '15px' : '14px' } }}
                        sx={{ '& .MuiInput-underline:before': { borderBottomColor: colorPalette.secondary.mediumGreen }, '& .MuiInput-underline:after': { borderBottomColor: '#fff' } }}
                      />
                      <TextField
                        label="Company"
                        value={exp.company || ''}
                        onChange={(e) => updateTempField(idx, 'company', e.target.value)}
                        fullWidth
                        variant="standard"
                        InputLabelProps={{ style: { color: colorPalette.secondary.mediumGreen } }}
                        InputProps={{ style: { color: '#fff', fontSize: isMobile ? '15px' : '14px' } }}
                        sx={{ '& .MuiInput-underline:before': { borderBottomColor: colorPalette.secondary.mediumGreen }, '& .MuiInput-underline:after': { borderBottomColor: '#fff' } }}
                      />
                      <Box sx={{ display: 'flex', gap: 1.5, flexDirection: isMobile ? 'column' : 'row' }}>
                        <TextField
                          label="Start Date"
                          value={exp.start_date || ''}
                          onChange={(e) => updateTempField(idx, 'start_date', e.target.value)}
                          fullWidth
                          variant="standard"
                          InputLabelProps={{ style: { color: colorPalette.secondary.mediumGreen } }}
                          InputProps={{ style: { color: '#fff', fontSize: isMobile ? '15px' : '14px' } }}
                          sx={{ '& .MuiInput-underline:before': { borderBottomColor: colorPalette.secondary.mediumGreen }, '& .MuiInput-underline:after': { borderBottomColor: '#fff' } }}
                        />
                        <TextField
                          label="End Date"
                          value={exp.end_date || ''}
                          onChange={(e) => updateTempField(idx, 'end_date', e.target.value)}
                          fullWidth
                          variant="standard"
                          InputLabelProps={{ style: { color: colorPalette.secondary.mediumGreen } }}
                          InputProps={{ style: { color: '#fff', fontSize: isMobile ? '15px' : '14px' } }}
                          sx={{ '& .MuiInput-underline:before': { borderBottomColor: colorPalette.secondary.mediumGreen }, '& .MuiInput-underline:after': { borderBottomColor: '#fff' } }}
                        />
                      </Box>
                      <TextField
                        label="Location"
                        value={exp.location || ''}
                        onChange={(e) => updateTempField(idx, 'location', e.target.value)}
                        fullWidth
                        variant="standard"
                        InputLabelProps={{ style: { color: colorPalette.secondary.mediumGreen } }}
                        InputProps={{ style: { color: '#fff', fontSize: isMobile ? '15px' : '14px' } }}
                        sx={{ '& .MuiInput-underline:before': { borderBottomColor: colorPalette.secondary.mediumGreen }, '& .MuiInput-underline:after': { borderBottomColor: '#fff' } }}
                      />
                      {/* Bullet Points - Individual Inputs */}
                   <Box width={'120%'}>
                        <Typography variant="caption" sx={{ color: colorPalette.secondary.mediumGreen, mb: 1, display: 'block' }}>
                          Responsibilities / Achievements (Bullet Points)
                        </Typography>
                        {(exp.bullets && exp.bullets.length > 0 ? exp.bullets : ['']).map((bullet, bulletIdx) => (
                          <Box key={bulletIdx} sx={{ display: 'flex', gap: 0.5, mb: 1.5, alignItems: 'flex-start' }}>
                            <TextField
                              value={bullet}
                              onChange={(e) => {
                                const newBullets = [...(exp.bullets || [''])];
                                newBullets[bulletIdx] = e.target.value;
                                updateTempField(idx, 'bullets', newBullets);
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
                                const newBullets = [...(exp.bullets || [''])];
                                newBullets.splice(bulletIdx, 1);
                                updateTempField(idx, 'bullets', newBullets.length > 0 ? newBullets : ['']);
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
                            const newBullets = [...(exp.bullets || ['']), ''];
                            updateTempField(idx, 'bullets', newBullets);
                          }}
                          size="small"
                          sx={{ color: colorPalette.secondary.mediumGreen, textTransform: 'none', fontSize: '12px' }}
                        >
                          Add Bullet Point
                        </Button>
                      </Box>
                    </Box>
                  </Box>
                ))}
                <Button
                  startIcon={<AddIcon />}
                  onClick={() => {
                    const newData = [...tempData, { title: '', company: '', bullets: [], start_date: '', end_date: '', location: '' }];
                    updateTempField(null, null, newData);
                  }}
                  sx={{ color: '#fff', textTransform: 'none', mt: 2 }}
                >
                  Add Experience
                </Button>
              </>
            ) : (
              // VIEW MODE
              <>
                {displayData.map((exp, idx) => (
                  <Box key={idx} sx={{ mb: 2.5, fontSize: isMobile ? '14px' : '13px' }}>
                    <Typography variant="body2" fontWeight={600} sx={{ fontSize: isMobile ? '15px' : '14px', color: '#fff' }}>
                      {exp.title} at {exp.company}
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: isMobile ? '13px' : '12px', color: colorPalette.secondary.mediumGreen }}>
                      {exp.start_date} - {exp.end_date}
                      {exp.location && ` | ${exp.location}`}
                    </Typography>
                    {exp.bullets && exp.bullets.length > 0 && (
                      <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                        {exp.bullets.map((bullet, bidx) => (
                          <li key={bidx} style={{ fontSize: isMobile ? '13px' : '12px', color: '#fff', marginBottom: '6px', textAlign:'justify' }}>{bullet}</li>
                        ))}
                      </ul>
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
  );
};

export default ExperienceSection;
