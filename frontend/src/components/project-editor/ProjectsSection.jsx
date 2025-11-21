import { Box, Typography, Paper, TextField, Accordion, AccordionSummary, AccordionDetails, useTheme, useMediaQuery, IconButton, Button } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SortableSection from './SortableSection';

const ProjectsSection = ({
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
                        InputLabelProps={{ style: { color: '#bdc3c7' } }}
                        InputProps={{ style: { color: '#fff', fontSize: isMobile ? '15px' : '14px' } }}
                        sx={{ '& .MuiInput-underline:before': { borderBottomColor: '#566573' }, '& .MuiInput-underline:after': { borderBottomColor: '#fff' } }}
                      />
                      <TextField
                        label="Description"
                        value={proj.description || ''}
                        onChange={(e) => updateTempField(idx, 'description', e.target.value)}
                        fullWidth
                        multiline
                        rows={6}
                        variant="standard"
                        InputLabelProps={{ style: { color: '#bdc3c7' } }}
                        InputProps={{ style: { color: '#fff', fontSize: isMobile ? '14px' : '13px', lineHeight: 1.6 } }}
                        sx={{ '& .MuiInput-underline:before': { borderBottomColor: '#566573' }, '& .MuiInput-underline:after': { borderBottomColor: '#fff' } }}
                      />
                      <TextField
                        label="Technologies (comma-separated)"
                        value={proj.technologies ? proj.technologies.join(', ') : ''}
                        onChange={(e) => updateTempField(idx, 'technologies', e.target.value.split(',').map(t => t.trim()))}
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
                    const newData = [...tempData, { name: '', description: '', technologies: [] }];
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
                  <Typography variant="caption" sx={{ fontSize: isMobile ? '13px' : '12px', color: '#ecf0f1' }}>{proj.description}</Typography>
                  {proj.technologies && proj.technologies.length > 0 && (
                    <Typography variant="caption" display="block" sx={{ fontStyle: 'italic', mt: 0.5, fontSize: isMobile ? '13px' : '12px', color: '#bdc3c7' }}>
                      Tech: {proj.technologies.join(', ')}
                    </Typography>
                  )}
                </Box>
              ))
            )}
          </Paper>
        </AccordionDetails>
      </Accordion>
    </SortableSection>
  );
};

export default ProjectsSection;
