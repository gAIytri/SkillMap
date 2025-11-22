import { Box, Typography, Paper, TextField, useTheme, useMediaQuery, IconButton, Button } from '@mui/material';
import { colorPalette } from '../../styles/theme';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

const SkillsSection = ({
  sectionKey,
  data,
  isEditing,
  tempData,
  updateTempField
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  if (!data || data.length === 0) return null;

  return (
    <Box>
          <Paper elevation={0} sx={{ p: isMobile ? 2 : 3, mb: 2, bgcolor: colorPalette.primary.darkGreen, color: '#fff' }}>
            {isEditing ? (
              // EDITING MODE
              <>
                {tempData.map((skillCat, idx) => (
                  <Box key={idx} sx={{ mb: 3.5, display: 'flex', gap: 2 }}>
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
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
                  <Typography variant="caption" sx={{ ml: 1, fontSize: isMobile ? '13px' : '12px', color: '#fff' }}>{skillCat.skills.join(', ')}</Typography>
                </Box>
              ))
            )}
      </Paper>
    </Box>
  );
};

export default SkillsSection;
