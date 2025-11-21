import { Box, Typography, Paper, TextField, Accordion, AccordionSummary, AccordionDetails, useTheme, useMediaQuery, IconButton, Button } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SortableSection from './SortableSection';

const SkillsSection = ({
  sectionKey,
  data,
  expanded,
  onToggle,
  renderSectionTitle,
  isEditing,
  tempData,
  updateTempField
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  if (!data || data.length === 0) return null;

  return (
    <SortableSection key={sectionKey} id={sectionKey}>
      <Accordion
        expanded={expanded || false}
        onChange={onToggle}
        sx={{ mb: 1 }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          {renderSectionTitle(sectionKey, true)}
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 2, pb: 3, px: isMobile ? 2 : 3 }}>
          <Paper elevation={0} sx={{ p: isMobile ? 2 : 3, mb: 2, bgcolor: '#2c3e50', color: '#fff' }}>
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
                        InputLabelProps={{ style: { color: '#bdc3c7' } }}
                        InputProps={{ style: { color: '#fff', fontSize: isMobile ? '15px' : '14px' } }}
                        sx={{ '& .MuiInput-underline:before': { borderBottomColor: '#566573' }, '& .MuiInput-underline:after': { borderBottomColor: '#fff' } }}
                      />
                      <TextField
                        label="Skills (comma-separated)"
                        value={skillCat.skills ? skillCat.skills.join(', ') : ''}
                        onChange={(e) => updateTempField(idx, 'skills', e.target.value.split(',').map(s => s.trim()))}
                        fullWidth
                        variant="standard"
                        InputLabelProps={{ style: { color: '#bdc3c7' } }}
                        InputProps={{ style: { color: '#fff', fontSize: isMobile ? '14px' : '13px' } }}
                        sx={{ '& .MuiInput-underline:before': { borderBottomColor: '#566573' }, '& .MuiInput-underline:after': { borderBottomColor: '#fff' } }}
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
                  <Typography variant="caption" sx={{ ml: 1, fontSize: isMobile ? '13px' : '12px', color: '#ecf0f1' }}>{skillCat.skills.join(', ')}</Typography>
                </Box>
              ))
            )}
          </Paper>
        </AccordionDetails>
      </Accordion>
    </SortableSection>
  );
};

export default SkillsSection;
