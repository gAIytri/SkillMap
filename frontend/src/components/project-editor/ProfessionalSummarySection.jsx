import { useState, useEffect } from 'react';
import { Box, Typography, Paper, TextField, useTheme, useMediaQuery, Button, Chip } from '@mui/material';
import { colorPalette } from '../../styles/theme';

const ProfessionalSummarySection = ({
  sectionKey,
  data,
  isEditing,
  tempData,
  onTempDataChange,
  history,
  onViewingPreviousVersion,
  onRestoreVersion
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Version selection: history.length = current version, 0 to history.length-1 = previous versions
  const [selectedVersionIndex, setSelectedVersionIndex] = useState(history?.length || 0);

  if (!data) return null;

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
      return history[selectedVersionIndex]?.resume_json?.professional_summary || 'No summary available';
    }
  };

  const handleRestoreVersion = () => {
    if (!isViewingCurrent && onRestoreVersion) {
      const versionData = history[selectedVersionIndex]?.resume_json?.professional_summary;
      if (versionData) {
        onRestoreVersion('professional_summary', versionData);
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
        <Paper elevation={0} sx={{ p: isMobile ? 2 : 3,mb:2, bgcolor: colorPalette.primary.darkGreen, color: '#fff' }}>
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
              InputProps={{ style: { color: '#fff', fontSize: isMobile ? '15px' : '14px', lineHeight: 1.6 } }}
              InputLabelProps={{ style: { color: colorPalette.secondary.mediumGreen } }}
              sx={{
                '& .MuiInput-underline:before': { borderBottomColor: colorPalette.secondary.mediumGreen },
                '& .MuiInput-underline:after': { borderBottomColor: '#fff' }
              }}
            />
          ) : (
            <Typography variant="body2" sx={{ fontSize: isMobile ? '14px' : '13px', lineHeight: 1.7, color: '#fff', textAlign:'justify'}}>
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
          <TextField
            value={tempData}
            onChange={(e) => onTempDataChange(e.target.value)}
            multiline
            rows={8}
            fullWidth
            variant="standard"
            autoFocus
            placeholder="Enter professional summary..."
            InputProps={{ style: { color: '#fff', fontSize: isMobile ? '15px' : '14px', lineHeight: 1.6 } }}
            InputLabelProps={{ style: { color: colorPalette.secondary.mediumGreen } }}
            sx={{
              '& .MuiInput-underline:before': { borderBottomColor: colorPalette.secondary.mediumGreen },
              '& .MuiInput-underline:after': { borderBottomColor: '#fff' }
            }}
          />
        ) : (
          <>
            <Typography variant="body2" sx={{ fontSize: isMobile ? '14px' : '13px', lineHeight: 1.7, color: '#fff', mb: !isViewingCurrent ? 3 : 0 , textAlign:'justify'}}>
              {getDisplayContent()}
            </Typography>

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

export default ProfessionalSummarySection;
